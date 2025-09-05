const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("🔍 Testing database connection...");
    const client = await pool.connect();
    console.log("✅ Database connection successful!");

    // Test a simple query
    const result = await client.query("SELECT NOW()");
    console.log("✅ Database query successful:", result.rows[0]);

    client.release();
    await pool.end();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("Error details:", error);
  }
}

testConnection();
