import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Admin cleanup endpoint — requires secret token
export async function POST(request: Request) {
  try {
    const { token, action } = await request.json();
    const adminToken = process.env.WEB_API_KEY || "aura_secret_token_123456";
    if (token !== adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: Record<string, any> = {};

    // Action: remove_ghost_accounts — remove test/ghost accounts with no recent updates
    if (action === "remove_ghost_accounts" || action === "all") {
      const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      // Find ghost accounts: last updated more than 2 days ago AND not the real account
      const ghostAccounts = await prisma.accountState.findMany({
        where: {
          lastUpdated: { lt: cutoff },
        },
        select: { account: true },
      });

      const ghostIds = ghostAccounts.map((a) => a.account);
      if (ghostIds.length > 0) {
        const delHistory = await prisma.performanceHistory.deleteMany({
          where: { account: { in: ghostIds } },
        });
        const delTrades = await prisma.activeTrade.deleteMany({
          where: { account: { in: ghostIds } },
        });
        const delAccounts = await prisma.accountState.deleteMany({
          where: { account: { in: ghostIds } },
        });
        results.ghost_accounts_removed = {
          accounts: ghostIds,
          history_rows: delHistory.count,
          trade_rows: delTrades.count,
          account_rows: delAccounts.count,
        };
      } else {
        results.ghost_accounts_removed = { accounts: [], message: "No ghost accounts found" };
      }
    }

    // Action: expire_stuck_commands — expire commands stuck in SENT state for > 1 hour
    if (action === "expire_stuck_commands" || action === "all") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const expired = await prisma.commandQueue.updateMany({
        where: {
          status: "SENT",
          createdAt: { lt: oneHourAgo },
        },
        data: {
          status: "EXPIRED",
        },
      });
      results.expired_commands = expired.count;
    }

    // Action: clean_old_history — remove history older than 30 days
    if (action === "clean_old_history" || action === "all") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const delOld = await prisma.performanceHistory.deleteMany({
        where: {
          date: { lt: thirtyDaysAgo },
        },
      });
      results.old_history_removed = delOld.count;
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Admin Cleanup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Check current state (counts)
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const adminToken = process.env.WEB_API_KEY || "aura_secret_token_123456";
    if (token !== adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const [allAccounts, ghostAccounts, stuckCommands, pendingCommands, historyCount] =
      await Promise.all([
        prisma.accountState.findMany({ select: { account: true, lastUpdated: true, status: true } }),
        prisma.accountState.findMany({
          where: { lastUpdated: { lt: cutoff } },
          select: { account: true, lastUpdated: true },
        }),
        prisma.commandQueue.count({
          where: {
            status: "SENT",
            createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
          },
        }),
        prisma.commandQueue.count({ where: { status: "PENDING" } }),
        prisma.performanceHistory.count(),
      ]);

    return NextResponse.json({
      all_accounts: allAccounts,
      ghost_accounts: ghostAccounts,
      stuck_commands_count: stuckCommands,
      pending_commands_count: pendingCommands,
      total_history_rows: historyCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
