import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@workspace/db";
import twilio from "twilio";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALERT_PHONE = "7789987015";
const ALERT_EMAIL = "amerkur@gmail.com";
const SAVINGS_THRESHOLD = 0.4; // 40% off

const destinations = [
  "Seattle",
  "Los Angeles",
  "San Diego",
  "Hawaii",
  "Miami",
  "New York",
  "Las Vegas",
];

interface Deal {
  destination: string;
  type: "flight" | "hotel";
  name: string;
  currentPrice: number;
  normalPrice: number;
  savingsPercent: number;
  url: string;
  details: string;
  stars?: number;
  isOcean?: boolean;
  departDate?: string;
  returnDate?: string;
  checkIn?: string;
  checkOut?: string;
  dealKey: string;
}

function getDealKey(deal: Deal): string {
  return `${deal.destination}-${deal.type}-${deal.name}-${deal.currentPrice}`.toLowerCase().replace(/\s+/g, "-");
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const allDeals: Deal[] = [];

  for (const dest of destinations) {
    try {
      const prompt = `Search for current travel deals from Vancouver, BC (YVR airport) to ${dest}.

Find:
1. Cheap flights departing from Vancouver (YVR) to ${dest} in the next 2-3 months
2. Hotel deals in ${dest} right now

For each deal found, provide:
- Current price (USD or CAD)
- Normal/average price for comparison
- Savings percentage
- Booking URL
- Dates

Focus on deals that are 40% or more below normal prices. Return your findings as a JSON array of objects with these fields:
{
  "destination": "${dest}",
  "type": "flight" or "hotel",
  "name": "airline name or hotel name",
  "currentPrice": number,
  "normalPrice": number,
  "savingsPercent": number (0-100),
  "url": "booking URL",
  "details": "brief description",
  "stars": number (hotels only, 1-5),
  "isOcean": boolean (hotels only),
  "departDate": "YYYY-MM-DD" (flights only),
  "returnDate": "YYYY-MM-DD" (flights only),
  "checkIn": "YYYY-MM-DD" (hotels only),
  "checkOut": "YYYY-MM-DD" (hotels only)
}

Only include deals with savingsPercent >= 40. If no deals found, return empty array [].`;

      const response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 2048,
        tools: [{ type: "web_search_20250305", name: "web_search" } as any],
        messages: [{ role: "user", content: prompt }],
      });

      // Extract JSON from response
      for (const block of response.content) {
        if (block.type === "text") {
          const jsonMatch = block.text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            try {
              const deals: Deal[] = JSON.parse(jsonMatch[0]);
              for (const deal of deals) {
                if (deal.savingsPercent >= 40) {
                  deal.dealKey = getDealKey(deal);
                  allDeals.push(deal);
                }
              }
            } catch {
              // JSON parse failed, skip
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error searching deals for ${dest}:`, err);
    }
  }

  if (!allDeals.length) {
    return NextResponse.json({ message: "No significant deals found", checked: destinations });
  }

  // Filter out deals we've already seen (same price point)
  const newDeals: Deal[] = [];
  for (const deal of allDeals) {
    const recent = await prisma.travelPriceHistory.findFirst({
      where: {
        dealKey: deal.dealKey,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // within 7 days
      },
    });
    if (!recent) {
      newDeals.push(deal);
      await prisma.travelPriceHistory.create({
        data: {
          dealKey: deal.dealKey,
          price: deal.currentPrice,
          label: `${deal.type}: ${deal.name} to ${deal.destination} - $${deal.currentPrice} (${deal.savingsPercent}% off)`,
        },
      });
    }
  }

  if (!newDeals.length) {
    return NextResponse.json({ message: "No new deals (already seen recently)", total: allDeals.length });
  }

  // Build SMS message
  const smsLines = newDeals.slice(0, 5).map((d) => {
    const icon = d.type === "flight" ? "✈" : "🏨";
    return `${icon} ${d.destination}: ${d.name} $${d.currentPrice} (${d.savingsPercent}% off)`;
  });
  const smsBody = `🔥 ${newDeals.length} Travel Deal${newDeals.length > 1 ? "s" : ""} from YVR:\n${smsLines.join("\n")}`;

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

  // Post to brianxolivia.com feed
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://brianxolivia.com";
    await fetch(`${baseUrl}/api/internal/travel-deal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
      },
      body: JSON.stringify({ deals: newDeals }),
    });
  } catch (err) {
    console.error("Failed to post deals to feed:", err);
  }

  return NextResponse.json({
    success: true,
    newDeals: newDeals.length,
    totalFound: allDeals.length,
    smsBodyPreview: smsBody,
  });
}
