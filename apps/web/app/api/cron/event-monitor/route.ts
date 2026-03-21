import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@workspace/db";
import twilio from "twilio";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALERT_PHONE = "7789987015";

const searchQueries = [
  "comedy shows Vancouver BC upcoming tickets",
  "music concerts Vancouver BC this month",
  "comedy shows Seattle WA upcoming tickets",
  "music concerts Seattle WA this month",
];

interface Event {
  name: string;
  venue: string;
  city: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: "comedy" | "music" | "other";
  ticketUrl?: string;
  price?: string;
  description?: string;
}

function hashEvent(event: Event): string {
  const key = `${event.name}|${event.venue}|${event.date}`.toLowerCase();
  return crypto.createHash("md5").update(key).digest("hex");
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const allEvents: Event[] = [];

  for (const query of searchQueries) {
    try {
      const prompt = `Search for: "${query}"

Find upcoming events and return as a JSON array with these fields:
{
  "name": "event/artist name",
  "venue": "venue name",
  "city": "city, state/province",
  "date": "YYYY-MM-DD",
  "time": "HH:MM" (24h, optional),
  "type": "comedy" or "music" or "other",
  "ticketUrl": "URL to buy tickets",
  "price": "price range as string e.g. $25-$50",
  "description": "1-2 sentence description"
}

Only include events happening in the next 60 days. Return empty array [] if nothing found.`;

      const response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 2048,
        tools: [{ type: "web_search_20250305", name: "web_search" } as any],
        messages: [{ role: "user", content: prompt }],
      });

      for (const block of response.content) {
        if (block.type === "text") {
          const jsonMatch = block.text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              const events: Event[] = JSON.parse(jsonMatch[0]);
              allEvents.push(...events);
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error searching events for "${query}":`, err);
    }
  }

  if (!allEvents.length) {
    return NextResponse.json({ message: "No events found" });
  }

  // Deduplicate against SeenEvent
  const newEvents: (Event & { hash: string })[] = [];
  for (const event of allEvents) {
    const hash = hashEvent(event);
    const existing = await prisma.seenEvent.findUnique({ where: { hash } });
    if (!existing) {
      newEvents.push({ ...event, hash });
      await prisma.seenEvent.create({ data: { hash } });
    }
  }

  if (!newEvents.length) {
    return NextResponse.json({ message: "No new events (all already seen)", total: allEvents.length });
  }

  // Group by type for SMS
  const comedyEvents = newEvents.filter((e) => e.type === "comedy");
  const musicEvents = newEvents.filter((e) => e.type === "music");

  const smsLines: string[] = [];

  if (comedyEvents.length) {
    smsLines.push(`🎤 Comedy (${comedyEvents.length}):`);
    comedyEvents.slice(0, 3).forEach((e) => {
      smsLines.push(`  ${e.name} @ ${e.venue}, ${e.city} — ${e.date}${e.price ? ` (${e.price})` : ""}`);
    });
  }

  if (musicEvents.length) {
    smsLines.push(`🎵 Music (${musicEvents.length}):`);
    musicEvents.slice(0, 3).forEach((e) => {
      smsLines.push(`  ${e.name} @ ${e.venue}, ${e.city} — ${e.date}${e.price ? ` (${e.price})` : ""}`);
    });
  }

  const smsBody = `🎭 ${newEvents.length} New Event${newEvents.length > 1 ? "s" : ""} Found:\n${smsLines.join("\n")}`;

  // Send Twilio SMS
  try {
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    await twilioClient.messages.create({
      body: smsBody,
      from: process.env.TWILIO_FROM_NUMBER,
      to: `+1${ALERT_PHONE.replace(/-/g, "")}`,
    });
  } catch (err) {
    console.error("Twilio SMS error:", err);
  }

  return NextResponse.json({
    success: true,
    newEvents: newEvents.length,
    totalFound: allEvents.length,
    smsBodyPreview: smsBody,
  });
}
