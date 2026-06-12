import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const verifyToken = (reqToken: string) => {
  const secureToken = process.env.WEB_API_KEY || "aura_secret_token_123456";
  return reqToken === secureToken;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.accountState.findMany();
    const history = await prisma.performanceHistory.findMany({
      orderBy: { date: "asc" }
    });
    const trades = await prisma.activeTrade.findMany();

    return NextResponse.json({
      status: "success",
      accounts,
      historyCount: history.length,
      historySample: history.slice(-10), // Mostra os últimos 10
      tradesCount: trades.length,
    });
  } catch (error: any) {
    console.error("Check DB Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
