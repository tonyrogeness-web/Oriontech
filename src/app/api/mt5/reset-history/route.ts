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
    const account = searchParams.get("account");

    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const whereFilter = account && account !== "all" ? { account: String(account) } : {};

    // Deleta o histórico de performance
    const deleteResult = await prisma.performanceHistory.deleteMany({
      where: whereFilter,
    });

    // Reseta o estado acumulado da conta (Lucro global, DD e histórico) no AccountState
    await prisma.accountState.updateMany({
      where: whereFilter,
      data: {
        dailyProfit: 0.0,
        totalProfit: 0.0,
        maxDrawdown: 0.0,
        ddReached10: false,
        ddReached20: false,
        trailingPeak: 0.0,
        trailingActive: false,
      },
    });

    return NextResponse.json({
      status: "success",
      message: `Historico de performance e acúmulos limpos com sucesso!`,
      deletedRecords: deleteResult.count,
    });
  } catch (error: any) {
    console.error("Reset History Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
