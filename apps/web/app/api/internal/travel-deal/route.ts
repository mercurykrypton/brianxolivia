import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@workspace/db";

export const runtime = "nodejs";

export interface TravelDeal {
  type: "flight" | "hotel";
  destination: string;
  name: string;
  stars?: number;
  isOcean?: boolean;
  currentPrice: number;
  normalPrice: number;
  savingsPercent: number;
  departDate?: string;
  returnDate?: string;
  checkIn?: string;
  checkOut?: string;
  url: string;
  details: string;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deals }: { deals: TravelDeal[] } = await req.json();
  if (!deals?.length) {
    return NextResponse.json({ error: "No deals provided" }, { status: 400 });
  }

  // Find the creator profile for amerkur@gmail.com
  const user = await prisma.user.findUnique({
    where: { email: "amerkur@gmail.com" },
    include: { creatorProfile: true },
  });

  if (!user?.creatorProfile) {
    return NextResponse.json(
      { error: "Creator profile not found for amerkur@gmail.com" },
      { status: 404 }
    );
  }

  const creatorProfileId = user.creatorProfile.id;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Group deals by destination for a cleaner post
  const byDestination = deals.reduce<Record<string, TravelDeal[]>>(
    (acc, deal) => {
      acc[deal.destination] = acc[deal.destination] ?? [];
      acc[deal.destination].push(deal);
      return acc;
    },
    {}
  );

  const destinationSummaries = Object.entries(byDestination)
    .map(([dest, destDeals]) => {
      const lines = destDeals.map((d) => {
        const icon = d.type === "flight" ? "✈️" : d.isOcean ? "🌊" : "🏨";
        const stars = d.stars ? ` (${d.stars}★)` : "";
        const dates =
          d.type === "flight"
            ? `${d.departDate} → ${d.returnDate}`
            : `${d.checkIn} – ${d.checkOut}`;
        return `${icon} **${d.name}**${stars} — $${d.currentPrice} ~~$${d.normalPrice}~~ **${d.savingsPercent}% off** | ${dates} | [Book](${d.url})`;
      });
      return `### ${dest}\n${lines.join("\n")}`;
    })
    .join("\n\n");

  const body = `*Automatically detected on ${today} — deals are 40%+ off average prices.*\n\n${destinationSummaries}`;

  const flightCount = deals.filter((d) => d.type === "flight").length;
  const hotelCount = deals.filter((d) => d.type === "hotel").length;
  const parts = [];
  if (flightCount) parts.push(`${flightCount} flight${flightCount > 1 ? "s" : ""}`);
  if (hotelCount) parts.push(`${hotelCount} hotel${hotelCount > 1 ? "s" : ""}`);

  const post = await prisma.post.create({
    data: {
      creatorProfileId,
      title: `🔥 Travel Deals Alert — ${parts.join(" & ")} from Vancouver (${today})`,
      body,
      contentType: "TEXT",
      isPaid: false,
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  await prisma.creatorProfile.update({
    where: { id: creatorProfileId },
    data: { postCount: { increment: 1 } },
  });

  return NextResponse.json({ success: true, postId: post.id });
}
