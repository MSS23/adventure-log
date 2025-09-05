const { PrismaClient } = require("@prisma/client");

async function testConnection() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Testing Prisma database connection...");

    // Test connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful!");

    // Test table access
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("Error code:", error.code);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      clientVersion: error.clientVersion,
    });
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
