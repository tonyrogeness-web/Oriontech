const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.accountState.findMany();
  console.log("ACCOUNTS:", JSON.stringify(accounts, null, 2));
  const history = await prisma.performanceHistory.findMany({
    orderBy: { date: "asc" }
  });
  console.log("HISTORY:", JSON.stringify(history, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
