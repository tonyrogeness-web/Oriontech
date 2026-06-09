import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Helper for security token verification
const verifyToken = (reqToken: string) => {
  const secureToken = process.env.WEB_API_KEY || "aura_secret_token_123456";
  return reqToken === secureToken;
};

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const {
      token,
      account,
      balance,
      equity,
      dailyProfit,
      floatingPl,
      totalProfit,
      maxDrawdown,
      status,
      symbol,
      trades = [],
      history = [],
      executedCommands = [],
    } = payload;

    // 1. Verify token
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!account) {
      return NextResponse.json({ error: "Account required" }, { status: 400 });
    }

    // 2. Mark executed commands as EXECUTED
    if (executedCommands.length > 0) {
      await prisma.commandQueue.updateMany({
        where: {
          id: { in: executedCommands },
          account: String(account),
        },
        data: {
          status: "EXECUTED",
          executedAt: new Date(),
        },
      });
    }

    // 3. Upsert AccountState
    await prisma.accountState.upsert({
      where: { account: String(account) },
      update: {
        balance: parseFloat(balance),
        equity: parseFloat(equity),
        dailyProfit: parseFloat(dailyProfit),
        floatingPl: parseFloat(floatingPl),
        totalProfit: parseFloat(totalProfit),
        maxDrawdown: parseFloat(maxDrawdown),
        status: status || "RUNNING",
      },
      create: {
        account: String(account),
        balance: parseFloat(balance),
        equity: parseFloat(equity),
        dailyProfit: parseFloat(dailyProfit),
        floatingPl: parseFloat(floatingPl),
        totalProfit: parseFloat(totalProfit),
        maxDrawdown: parseFloat(maxDrawdown),
        status: status || "RUNNING",
      },
    });

    // 4. Update Active Trades (Delete old, Insert new for this symbol)
    if (symbol) {
      await prisma.activeTrade.deleteMany({
        where: {
          account: String(account),
          symbol: String(symbol),
        },
      });
    } else {
      await prisma.activeTrade.deleteMany({
        where: { account: String(account) },
      });
    }

    if (trades.length > 0) {
      await prisma.activeTrade.createMany({
        data: trades.map((t: any) => ({
          account: String(account),
          ticket: String(t.ticket),
          symbol: String(t.symbol),
          type: String(t.type),
          volume: parseFloat(t.volume || 0),
          entryPrice: parseFloat(t.entryPrice || 0),
          currentPrice: parseFloat(t.currentPrice !== undefined && t.currentPrice !== null ? t.currentPrice : (t.entryPrice || 0)),
          currentProfit: parseFloat(t.currentProfit || 0),
          magicNumber: parseInt(t.magicNumber || "0"),
        })),
      });
    }

    // 5. Upsert PerformanceHistory
    if (history.length > 0) {
      for (const h of history) {
        const hDate = new Date(h.date);
        // Normalize date to midnight (00:00:00) to ensure single record per day
        hDate.setUTCHours(0, 0, 0, 0);

        await prisma.performanceHistory.upsert({
          where: {
            account_date: {
              account: String(account),
              date: hDate,
            },
          },
          update: {
            profit: parseFloat(h.profit),
            balance: parseFloat(h.balance),
          },
          create: {
            account: String(account),
            date: hDate,
            profit: parseFloat(h.profit),
            balance: parseFloat(h.balance),
          },
        });
      }
    }

    // 6. Fetch pending commands
    const pendingCommands = await prisma.commandQueue.findMany({
      where: {
        account: String(account),
        status: "PENDING",
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      status: "success",
      commands: pendingCommands.map((c) => ({
        id: c.id,
        command: c.command,
        symbol: c.symbol,
      })),
    });
  } catch (error: any) {
    console.error("MT5 Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
