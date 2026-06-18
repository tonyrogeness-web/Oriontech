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
      newsActive = false,
      newsFrozen = false,
      newsName = "",
      trailingActive = false,
      trailingPeak = 0,
      ddReached10 = false,
      ddReached20 = false,
      brlRate = 5.20,
      equityCycleBase = 0.0,
      equityCycleTargetPct = 5.0,
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

    // 3. Update Active Trades and AccountState in a single database transaction
    const parsedBalance = parseFloat(balance) || 0;
    const parsedEquity = parseFloat(equity !== undefined && equity !== null ? equity : balance) || 0;
    const parsedBrlRate = parseFloat(brlRate) || 5.20;

    await prisma.$transaction(async (tx) => {
      if (symbol) {
        await tx.activeTrade.deleteMany({
          where: {
            account: String(account),
            symbol: String(symbol),
          },
        });
      } else {
        await tx.activeTrade.deleteMany({
          where: { account: String(account) },
        });
      }

      if (trades.length > 0) {
        await tx.activeTrade.createMany({
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
            tp: t.tp !== undefined && t.tp !== null ? parseFloat(t.tp) : null,
            sl: t.sl !== undefined && t.sl !== null ? parseFloat(t.sl) : null,
          })),
        });
      }

      // 4. Calculate Global floatingPl, equity, and maxDrawdown from all active trades
      const allActiveTrades = await tx.activeTrade.findMany({
        where: { account: String(account) },
      });
      const globalFloatingPl = allActiveTrades.reduce((sum, t) => sum + (t.currentProfit || 0), 0);
      const globalDrawdown = parsedBalance > 0 ? (Math.abs(Math.min(0, globalFloatingPl)) / parsedBalance) * 100 : 0;

      // 5. Upsert AccountState with global unified calculations
      await tx.accountState.upsert({
        where: { account: String(account) },
        update: {
          balance: parsedBalance,
          equity: parsedEquity,
          dailyProfit: parseFloat(dailyProfit) || 0,
          floatingPl: globalFloatingPl,
          totalProfit: parseFloat(totalProfit) || 0,
          maxDrawdown: globalDrawdown,
          status: status || "RUNNING",
          newsActive: Boolean(newsActive),
          newsFrozen: Boolean(newsFrozen),
          newsName: String(newsName || ""),
          trailingActive: Boolean(trailingActive),
          trailingPeak: parseFloat(trailingPeak) || 0,
          ddReached10: Boolean(ddReached10),
          ddReached20: Boolean(ddReached20),
          brlRate: parsedBrlRate,
          equityCycleBase: parseFloat(equityCycleBase) || 0.0,
          equityCycleTargetPct: parseFloat(equityCycleTargetPct) || 5.0,
        },
        create: {
          account: String(account),
          balance: parsedBalance,
          equity: parsedEquity,
          dailyProfit: parseFloat(dailyProfit) || 0,
          floatingPl: globalFloatingPl,
          totalProfit: parseFloat(totalProfit) || 0,
          maxDrawdown: globalDrawdown,
          status: status || "RUNNING",
          newsActive: Boolean(newsActive),
          newsFrozen: Boolean(newsFrozen),
          newsName: String(newsName || ""),
          trailingActive: Boolean(trailingActive),
          trailingPeak: parseFloat(trailingPeak) || 0,
          ddReached10: Boolean(ddReached10),
          ddReached20: Boolean(ddReached20),
          brlRate: parsedBrlRate,
          equityCycleBase: parseFloat(equityCycleBase) || 0.0,
          equityCycleTargetPct: parseFloat(equityCycleTargetPct) || 5.0,
        },
      });
    });

    // 5. Upsert PerformanceHistory
    if (history.length > 0) {
      for (const h of history) {
        if (!h.date) continue;
        const cleanDateStr = String(h.date).replace(/\./g, "-");
        // Parse as UTC Noon to prevent timezone shifting
        const [yr, mo, dy] = cleanDateStr.split("-").map(Number);
        const hDate = new Date(Date.UTC(yr, mo - 1, dy, 12, 0, 0, 0));

        if (isNaN(hDate.getTime())) {
          console.warn(`[MT5 Update] Data inválida recebida no histórico: ${h.date}`);
          continue;
        }

        // Cutoff: ignorar dados anteriores a 16/06/2026 — fechamento forçado (não voluntário) antes dessa data
        const cutoffDate = new Date(Date.UTC(2026, 5, 16, 12, 0, 0, 0));
        if (hDate.getTime() < cutoffDate.getTime()) {
          continue;
        }

        const todayDate = new Date();
        const todayUTCNoon = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), todayDate.getUTCDate(), 12, 0, 0, 0));
        const isToday = hDate.getTime() === todayUTCNoon.getTime();

        if (isToday) {
          // For today, we upsert/update live
          await prisma.performanceHistory.upsert({
            where: {
              account_date: {
                account: String(account),
                date: hDate,
              },
            },
            update: {
              profit: parseFloat(h.profit) || 0,
              balance: parseFloat(h.balance) || 0,
              equity: parsedEquity,
              gain: h.gain !== undefined ? parseFloat(h.gain) : undefined,
              loss: h.loss !== undefined ? parseFloat(h.loss) : undefined,
            },
            create: {
              account: String(account),
              date: hDate,
              profit: parseFloat(h.profit) || 0,
              balance: parseFloat(h.balance) || 0,
              equity: parsedEquity,
              gain: h.gain !== undefined ? parseFloat(h.gain) : 0.0,
              loss: h.loss !== undefined ? parseFloat(h.loss) : 0.0,
            },
          });
        } else {
          // For past days, we update/upsert using h.equity or h.balance to preserve historical accuracy (BUG-D3)
          await prisma.performanceHistory.upsert({
            where: {
              account_date: {
                account: String(account),
                date: hDate,
              },
            },
            update: {
              profit: parseFloat(h.profit) || 0,
              balance: parseFloat(h.balance) || 0,
              equity: h.equity !== undefined ? parseFloat(h.equity) : parseFloat(h.balance),
              gain: h.gain !== undefined ? parseFloat(h.gain) : undefined,
              loss: h.loss !== undefined ? parseFloat(h.loss) : undefined,
            },
            create: {
              account: String(account),
              date: hDate,
              profit: parseFloat(h.profit) || 0,
              balance: parseFloat(h.balance) || 0,
              equity: h.equity !== undefined ? parseFloat(h.equity) : parseFloat(h.balance),
              gain: h.gain !== undefined ? parseFloat(h.gain) : 0.0,
              loss: h.loss !== undefined ? parseFloat(h.loss) : 0.0,
            },
          });
        }
      }
    }

    // 6. Fetch pending commands (both PENDING and SENT, to retry if not confirmed yet)
    const pendingCommands = await prisma.commandQueue.findMany({
      where: {
        account: String(account),
        status: { in: ["PENDING", "SENT"] },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (pendingCommands.length > 0) {
      const pendingIds = pendingCommands.filter((c) => c.status === "PENDING").map((c) => c.id);
      if (pendingIds.length > 0) {
        await prisma.commandQueue.updateMany({
          where: {
            id: { in: pendingIds },
          },
          data: {
            status: "SENT",
          },
        });
      }
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
