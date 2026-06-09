import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.activeTrade.deleteMany({
      where: { account: "123456" }
    });
    await prisma.performanceHistory.deleteMany({
      where: { account: "123456" }
    });
    await prisma.commandQueue.deleteMany({
      where: { account: "123456" }
    });
    await prisma.accountState.deleteMany({
      where: { account: "123456" }
    });
    return NextResponse.json({ status: "cleaned" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
