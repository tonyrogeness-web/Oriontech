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
    const allAccounts = await prisma.accountState.findMany({
      orderBy: { lastUpdated: "desc" },
    });

    // If there is no data in the database yet, return mock data for initial UI rendering
    if (allAccounts.length === 0) {
      return NextResponse.json({
        ...getMockData(),
        isMock: true,
        mockReason: "DB_EMPTY",
      });
    }

    // Filter out ghost/stale accounts: only keep accounts updated within the last 2 days
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const accounts = allAccounts.filter(
      (acc) => new Date(acc.lastUpdated) >= twoDaysAgo
    );

    // If all accounts are stale (VPS down?), return the most recent one anyway
    const activeAccounts = accounts.length > 0 ? accounts : allAccounts.slice(0, 1);
    const primaryAccount = activeAccounts[0];

    // Scope queries to active accounts only
    const activeAccountIds = activeAccounts.map((a) => String(a.account));
    const trades = await prisma.activeTrade.findMany({
      where: { account: { in: activeAccountIds } },
      orderBy: { createdAt: "desc" },
    });

    // BUG-D1: Removed the destructive deleteMany operation from GET query to preserve history

    const history = await prisma.performanceHistory.findMany({
      where: { account: String(primaryAccount.account) },
      orderBy: { date: "asc" },
    });

    const pendingCommandsCount = await prisma.commandQueue.count({
      where: { status: "PENDING", account: String(primaryAccount.account) },
    });

    // Filtro de data: ignorar histórico anterior a 16/06/2026 (fechamento forçado, não voluntário)
    const histCutoff = new Date(Date.UTC(2026, 5, 16, 0, 0, 0, 0));
    const cleanHistory = history
      .filter((h) => new Date(h.date).getTime() >= histCutoff.getTime())
      .map((h) => ({
        date: h.date.toISOString(),
        profit: h.profit,
        balance: h.balance,
        equity: h.equity,
        gain: h.gain,
        loss: h.loss,
      }));

    return NextResponse.json({
      isMock: false,
      accounts: activeAccounts,
      trades,
      history: cleanHistory,
      pendingCommandsCount,
    });
  } catch (error: any) {
    console.error("Dashboard Data Fetch Error (falling back to mock data):", error);
    return NextResponse.json({
      ...getMockData(),
      isMock: true,
      mockReason: "DB_ERROR",
      dbError: error?.message || "Unknown error",
    });
  }
}
