import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      next: { revalidate: 600 } // Cache for 10 minutes
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch from FairEconomy: ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Failed to fetch calendar data:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}
