const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.accountState.findMany();
  console.log("ACCOUNTS:", JSON.stringify(accounts, null, 2));
  
  const activeTrades = await prisma.activeTrade.findMany({
    orderBy: { createdAt: "desc" }
  });
  console.log("ACTIVE TRADES:", JSON.stringify(activeTrades, null, 2));
  
  const gbpTrades = activeTrades.filter(t => t.symbol.includes("GBP"));
  const buyGbpVolume = gbpTrades.filter(t => t.type === "BUY").reduce((sum, t) => sum + t.volume, 0);
  const sellGbpVolume = gbpTrades.filter(t => t.type === "SELL").reduce((sum, t) => sum + t.volume, 0);
  
  console.log("GBP BUY TOTAL VOLUME:", buyGbpVolume.toFixed(3), "L");
  console.log("GBP SELL TOTAL VOLUME:", sellGbpVolume.toFixed(3), "L");
  console.log("NUMBER OF ACTIVE GBP TRADES:", gbpTrades.length);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
