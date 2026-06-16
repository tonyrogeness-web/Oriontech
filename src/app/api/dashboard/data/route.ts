import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function getMockData() {
  const mockAccount = {
    account: "88812345 (DEMO - DB OFFLINE)",
    balance: 10000.0,
    equity: 9850.5,
    dailyProfit: 154.2,
    floatingPl: -149.5,
    totalProfit: 1240.8,
    maxDrawdown: 1.49,
    status: "RUNNING",
    lastUpdated: new Date().toISOString(),
    // [BUG-N4 FIX] Campos de filtro de noticias ausentes no mock — adicionados com defaults
    newsActive: false,
    newsFrozen: false,
    newsName: "",
    trailingActive: false,
    trailingPeak: 0.0,
    ddReached10: false,
    ddReached20: false,
    brlRate: 5.20,
    equityCycleBase: 10000.0,
    equityCycleTargetPct: 5.0,
  };

  const mockTrades = [
    {
      id: 1,
      account: "88812345 (DEMO - DB OFFLINE)",
      ticket: "7726351",
      symbol: "EURUSD",
      type: "BUY",
      volume: 0.03,
      entryPrice: 1.0854,
      currentPrice: 1.0832,
      currentProfit: -6.6,
      magicNumber: 88800,
      tp: 1.0880,
      sl: 1.0790,
    },
    {
      id: 2,
      account: "88812345 (DEMO - DB OFFLINE)",
      ticket: "7726355",
      symbol: "EURUSD",
      type: "BUY",
      volume: 0.05,
      entryPrice: 1.0825,
      currentPrice: 1.0832,
      currentProfit: 3.5,
      magicNumber: 88800,
      tp: 1.0880,
      sl: 1.0790,
    },
    {
      id: 3,
      account: "88812345 (DEMO - DB OFFLINE)",
      ticket: "7726368",
      symbol: "GBPUSD",
      type: "SELL",
      volume: 0.02,
      entryPrice: 1.2710,
      currentPrice: 1.2725,
      currentProfit: -3.0,
      magicNumber: 88800,
      tp: 1.2670,
      sl: 1.2750,
    },
  ];

  const mockHistory = [
    { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), profit: 45.2, balance: 10045.2, equity: 10020.2, gain: 55.2, loss: -10.0 },
    { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), profit: -12.5, balance: 10032.7, equity: 10012.7, gain: 15.0, loss: -27.5 },
    { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), profit: 89.1, balance: 10121.8, equity: 10111.8, gain: 95.0, loss: -5.9 },
    { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), profit: 34.0, balance: 10155.8, equity: 10105.8, gain: 40.0, loss: -6.0 },
    { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), profit: -22.4, balance: 10133.4, equity: 10093.4, gain: 10.0, loss: -32.4 },
    { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), profit: 95.8, balance: 10229.2, equity: 10219.2, gain: 110.0, loss: -14.2 },
    { date: new Date().toISOString(), profit: 154.2, balance: 10383.4, equity: 10233.4, gain: 180.0, loss: -25.8 },
  ];

  return {
    isMock: true,
    accounts: [mockAccount],
    trades: mockTrades,
    history: mockHistory,
    pendingCommandsCount: 0,
  };
}

export async function GET() {
  try {
    // Test DB connection first
    const accounts = await prisma.accountState.findMany({
      orderBy: { lastUpdated: "desc" },
    });

    // If there is no data in the database yet, return mock data for initial UI rendering
    if (accounts.length === 0) {
      // DB is accessible but empty — robot hasn't sent data yet
      return NextResponse.json({
        ...getMockData(),
        isMock: true,
        mockReason: "DB_EMPTY",
      });
    }

    // Otherwise, fetch real data from database
    const trades = await prisma.activeTrade.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Programs manual delete of performance history before June 16, 2026
    await prisma.performanceHistory.deleteMany({
      where: {
        date: {
          lt: new Date("2026-06-16T00:00:00.000Z"),
        },
      },
    });

    // Cleanup old midnight duplicates to ensure only UTC noon records are kept
    const allHistoryDb = await prisma.performanceHistory.findMany({
      where: { account: String(accounts[0].account) },
    });
    const midnightIds = allHistoryDb
      .filter((h) => h.date.getUTCHours() === 0)
      .map((h) => h.id);
    if (midnightIds.length > 0) {
      await prisma.performanceHistory.deleteMany({
        where: { id: { in: midnightIds } },
      });
    }

    const history = await prisma.performanceHistory.findMany({
      orderBy: { date: "asc" },
    });

    const pendingCommandsCount = await prisma.commandQueue.count({
      where: { status: "PENDING" },
    });

    const cleanHistory = history.map((h) => {
      const isJune16 = h.date.toISOString().startsWith("2026-06-16");
      return {
        date: h.date.toISOString(),
        profit: isJune16 ? 0.0 : h.profit,
        balance: h.balance,
        equity: h.equity,
        gain: isJune16 ? 0.0 : h.gain,
        loss: isJune16 ? 0.0 : h.loss,
      };
    });

    const adjustedAccounts = accounts.map((acc) => ({
      ...acc,
      totalProfit: acc.totalProfit,
    }));

    return NextResponse.json({
      isMock: false,
      accounts: adjustedAccounts,
      trades,
      history: cleanHistory,
      pendingCommandsCount,
    });
  } catch (error: any) {
    console.error("Dashboard Data Fetch Error (falling back to mock data):", error);
    // Return mock data but also expose diagnostic info for debugging
    return NextResponse.json({
      ...getMockData(),
      isMock: true,
      mockReason: "DB_ERROR",
      dbError: error?.message || "Unknown error",
    });
  }
}
