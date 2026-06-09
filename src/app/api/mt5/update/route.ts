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

    // 3. Update Active Trades (Delete old, Insert new for this symbol)
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

    // 4. Calculate Global floatingPl, equity, and maxDrawdown from all active trades of the account
    const allActiveTrades = await prisma.activeTrade.findMany({
      where: { account: String(account) },
    });
    const globalFloatingPl = allActiveTrades.reduce((sum, t) => sum + (t.currentProfit || 0), 0);
    const parsedBalance = parseFloat(balance);
    const globalEquity = parsedBalance + globalFloatingPl;
    const globalDrawdown = parsedBalance > 0 ? (Math.abs(Math.min(0, globalFloatingPl)) / parsedBalance) * 100 : 0;

    // 5. Upsert AccountState with global unified calculations
    await prisma.accountState.upsert({
      where: { account: String(account) },
      update: {
        balance: parsedBalance,
        equity: globalEquity,
        dailyProfit: parseFloat(dailyProfit),
        floatingPl: globalFloatingPl,
        totalProfit: parseFloat(totalProfit),
        maxDrawdown: globalDrawdown,
        status: status || "RUNNING",
      },
      create: {
        account: String(account),
        balance: parsedBalance,
        equity: globalEquity,
        dailyProfit: parseFloat(dailyProfit),
        floatingPl: globalFloatingPl,
        totalProfit: parseFloat(totalProfit),
        maxDrawdown: globalDrawdown,
        status: status || "RUNNING",
      },
    });

    // 5. Upsert PerformanceHistory
    if (history.length > 0) {
      for (const h of history) {
        if (!h.date) continue;
        const cleanDateStr = String(h.date).replace(/\./g, "-");
        const hDate = new Date(cleanDateStr);
        if (isNaN(hDate.getTime())) {
          console.warn(`[MT5 Update] Data inválida recebida no histórico: ${h.date}`);
          continue;
        }
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

    if (pendingCommands.length > 0) {
      await prisma.commandQueue.updateMany({
        where: {
          id: { in: pendingCommands.map((c) => c.id) },
        },
        data: {
          status: "EXECUTED",
          executedAt: new Date(),
        },
      });
    }

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
