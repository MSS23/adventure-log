#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";
import { performance } from "perf_hooks";

const db = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  FAST: 50, // < 50ms
  ACCEPTABLE: 150, // < 150ms
  SLOW: 500, // < 500ms
  VERY_SLOW: 1000, // >= 1000ms
};

interface QueryTest {
  name: string;
  description: string;
  query: () => Promise<any>;
  expectedThreshold: number;
}

/**
 * Measure query execution time
 */
async function measureQuery(
  name: string,
  queryFn: () => Promise<any>
): Promise<{
  name: string;
  duration: number;
  result: any;
  status: "FAST" | "ACCEPTABLE" | "SLOW" | "VERY_SLOW";
}> {
  const start = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - start;

    let status: "FAST" | "ACCEPTABLE" | "SLOW" | "VERY_SLOW";
    if (duration < PERFORMANCE_THRESHOLDS.FAST) {
      status = "FAST";
    } else if (duration < PERFORMANCE_THRESHOLDS.ACCEPTABLE) {
      status = "ACCEPTABLE";
    } else if (duration < PERFORMANCE_THRESHOLDS.SLOW) {
      status = "SLOW";
    } else {
      status = "VERY_SLOW";
    }

    return { name, duration, result, status };
  } catch (error) {
    console.error(`Query failed: ${name}`, error);
    return {
      name,
      duration: performance.now() - start,
      result: null,
      status: "VERY_SLOW",
    };
  }
}

/**
 * Test critical query paths
 */
const QUERY_TESTS: QueryTest[] = [
  {
    name: "User Dashboard Data",
    description: "Load user profile with stats for dashboard",
    query: async () => {
      // This simulates loading dashboard data for first user
      const users = await db.user.findMany({ take: 1 });
      if (!users.length) return null;

      return await db.user.findUnique({
        where: { id: users[0].id },
        include: {
          albums: {
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
              photos: { take: 1 },
              _count: { select: { photos: true } },
            },
          },
          badges: {
            take: 10,
            include: { badge: true },
            orderBy: { unlockedAt: "desc" },
          },
          _count: {
            select: {
              followers: true,
              following: true,
              albums: true,
            },
          },
        },
      });
    },
    expectedThreshold: PERFORMANCE_THRESHOLDS.ACCEPTABLE,
  },

  {
    name: "Album Feed Query",
    description: "Load paginated public albums for feed",
    query: async () => {
      return await db.album.findMany({
        take: 20,
        where: {
          privacy: "PUBLIC",
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          photos: {
            take: 1,
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: { photos: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    },
    expectedThreshold: PERFORMANCE_THRESHOLDS.ACCEPTABLE,
  },

  {
    name: "Social Feed Query",
    description: "Load activity feed for social features",
    query: async () => {
      const users = await db.user.findMany({ take: 1 });
      if (!users.length) return null;

      // Get followed users
      const follows = await db.follow.findMany({
        where: { followerId: users[0].id },
        select: { followingId: true },
      });

      const followedUserIds = follows.map((f) => f.followingId);

      return await db.activity.findMany({
        take: 20,
        where: {
          OR: [{ userId: { in: followedUserIds } }, { userId: users[0].id }],
        },
        orderBy: { createdAt: "desc" },
      });
    },
    expectedThreshold: PERFORMANCE_THRESHOLDS.ACCEPTABLE,
  },

  {
    name: "Globe Data Query",
    description: "Load country data for 3D globe",
    query: async () => {
      return await db.$queryRaw`
        SELECT 
          "countryCode",
          "country",
          COUNT(*) as album_count,
          COUNT(DISTINCT "userId") as visitor_count
        FROM "Album" 
        WHERE "deletedAt" IS NULL 
          AND "privacy" = 'PUBLIC'
          AND "countryCode" IS NOT NULL
        GROUP BY "countryCode", "country"
        ORDER BY album_count DESC
        LIMIT 100
      `;
    },
    expectedThreshold: PERFORMANCE_THRESHOLDS.ACCEPTABLE,
  },

  {
    name: "User Profile Lookup",
    description: "Fast user lookup by username",
    query: async () => {
      const users = await db.user.findMany({ take: 1 });
      if (!users.length || !users[0].username) return null;

      return await db.user.findUnique({
        where: { username: users[0].username },
        include: {
          albums: {
            take: 12,
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: {
              photos: { take: 1 },
            },
          },
          _count: {
            select: {
              albums: true,
              followers: true,
              following: true,
            },
          },
        },
      });
    },
    expectedThreshold: PERFORMANCE_THRESHOLDS.FAST,
  },

  {
    name: "Album Photos Query",
    description: "Load photos for album view",
    query: async () => {
      const albums = await db.album.findMany({ take: 1 });
      if (!albums.length) return null;

      return await db.albumPhoto.findMany({
        where: {
          albumId: albums[0].id,
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
      });
    },
    expectedThreshold: PERFORMANCE_THRESHOLDS.FAST,
  },

  {
    name: "Badge Progress Query",
    description: "Calculate badge progress for user",
    query: async () => {
      const users = await db.user.findMany({ take: 1 });
      if (!users.length) return null;

      return await Promise.all([
        db.badge.findMany({ where: { isActive: true } }),
        db.userBadge.findMany({
          where: { userId: users[0].id },
          include: { badge: true },
        }),
      ]);
    },
    expectedThreshold: PERFORMANCE_THRESHOLDS.ACCEPTABLE,
  },

  {
    name: "Notification Count Query",
    description: "Get unread notification count",
    query: async () => {
      const users = await db.user.findMany({ take: 1 });
      if (!users.length) return null;

      return await db.notification.count({
        where: {
          userId: users[0].id,
          isRead: false,
        },
      });
    },
    expectedThreshold: PERFORMANCE_THRESHOLDS.FAST,
  },

  {
    name: "Search Albums Query",
    description: "Search albums by title and location",
    query: async () => {
      return await db.album.findMany({
        take: 10,
        where: {
          AND: [
            { deletedAt: null },
            { privacy: "PUBLIC" },
            {
              OR: [
                { title: { contains: "adventure", mode: "insensitive" } },
                { country: { contains: "United", mode: "insensitive" } },
                { city: { contains: "New", mode: "insensitive" } },
              ],
            },
          ],
        },
        include: {
          user: {
            select: { name: true, username: true, image: true },
          },
          photos: { take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });
    },
    expectedThreshold: PERFORMANCE_THRESHOLDS.SLOW,
  },
];

/**
 * Check for missing indexes by analyzing slow queries
 */
async function analyzeIndexes() {
  console.log("🔍 Analyzing Database Indexes...\n");

  const recommendations = [];

  // Check if we have data to test with
  const userCount = await db.user.count();
  const albumCount = await db.album.count();
  const photoCount = await db.albumPhoto.count();

  console.log(`📊 Database Stats:`);
  console.log(`   Users: ${userCount}`);
  console.log(`   Albums: ${albumCount}`);
  console.log(`   Photos: ${photoCount}\n`);

  if (userCount === 0) {
    console.log(
      "⚠️  No users found. Run `npm run db:seed` to add test data.\n"
    );
    recommendations.push(
      "Seed database with test data for performance testing"
    );
  }

  if (albumCount < 100) {
    console.log(
      "⚠️  Low album count. Performance testing is more meaningful with more data.\n"
    );
    recommendations.push(
      "Consider adding more test albums for better performance analysis"
    );
  }

  // Existing indexes from schema
  const existingIndexes = [
    "User: email (unique)",
    "User: username (unique)",
    "Album: (userId, createdAt)",
    "Album: (country, privacy)",
    "Album: (latitude, longitude)",
    "Album: (privacy, createdAt)",
    "AlbumPhoto: (albumId, createdAt)",
    "Follow: (followerId, followingId) unique",
    "Like: (userId, targetType, targetId) unique",
    "Comment: (targetType, targetId, createdAt)",
    "Comment: (userId, createdAt)",
    "Activity: (userId, createdAt)",
    "Activity: (createdAt DESC)",
    "Notification: (userId, isRead) - recommended",
  ];

  console.log("📋 Current Database Indexes:");
  console.log("━".repeat(50));
  existingIndexes.forEach((index) => console.log(`✅ ${index}`));
  console.log("");

  // Recommended additional indexes based on query patterns
  const recommendedIndexes = [
    {
      table: "Notification",
      index: "(userId, isRead, createdAt)",
      reason: "Fast unread notification queries and pagination",
    },
    {
      table: "Album",
      index: "(privacy, deletedAt, createdAt)",
      reason: "Optimized public album feeds with soft delete filtering",
    },
    {
      table: "AlbumPhoto",
      index: "(deletedAt, createdAt)",
      reason: "Photo queries with soft delete filtering",
    },
    {
      table: "User",
      index: "(role, createdAt)",
      reason: "Admin queries and user management",
    },
    {
      table: "Badge",
      index: "(isActive, category)",
      reason: "Badge listing by category",
    },
  ];

  if (recommendedIndexes.length > 0) {
    console.log("💡 Recommended Additional Indexes:");
    console.log("━".repeat(50));
    recommendedIndexes.forEach((rec) => {
      console.log(`📝 ${rec.table}: ${rec.index}`);
      console.log(`   Reason: ${rec.reason}\n`);
    });
  }

  return recommendations;
}

/**
 * Run performance tests
 */
async function runPerformanceTests() {
  console.log("⚡ Running Performance Tests...\n");

  const results = [];

  for (const test of QUERY_TESTS) {
    console.log(`Testing: ${test.name}...`);
    const result = await measureQuery(test.name, test.query);
    results.push(result);

    const statusEmoji = {
      FAST: "🚀",
      ACCEPTABLE: "✅",
      SLOW: "⚠️",
      VERY_SLOW: "❌",
    }[result.status];

    console.log(
      `${statusEmoji} ${result.duration.toFixed(2)}ms - ${result.status}\n`
    );
  }

  return results;
}

/**
 * Generate performance report
 */
function generateReport(results: any[], recommendations: string[]) {
  console.log("📈 Performance Report:");
  console.log("━".repeat(80));

  const summary = results.reduce(
    (acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log(
    `🚀 Fast queries (< ${PERFORMANCE_THRESHOLDS.FAST}ms): ${summary.FAST || 0}`
  );
  console.log(
    `✅ Acceptable queries (< ${PERFORMANCE_THRESHOLDS.ACCEPTABLE}ms): ${summary.ACCEPTABLE || 0}`
  );
  console.log(
    `⚠️  Slow queries (< ${PERFORMANCE_THRESHOLDS.SLOW}ms): ${summary.SLOW || 0}`
  );
  console.log(
    `❌ Very slow queries (>= ${PERFORMANCE_THRESHOLDS.SLOW}ms): ${summary.VERY_SLOW || 0}`
  );

  const slowQueries = results.filter(
    (r) => r.status === "SLOW" || r.status === "VERY_SLOW"
  );

  if (slowQueries.length > 0) {
    console.log("\\n🐌 Slow Queries Requiring Attention:");
    console.log("━".repeat(50));
    slowQueries.forEach((query) => {
      console.log(`   ${query.name}: ${query.duration.toFixed(2)}ms`);
    });
  }

  if (recommendations.length > 0) {
    console.log("\\n💡 Recommendations:");
    console.log("━".repeat(50));
    recommendations.forEach((rec) => console.log(`• ${rec}`));
  }

  const avgDuration =
    results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`\\n📊 Average Query Time: ${avgDuration.toFixed(2)}ms`);

  // Determine overall health
  const healthScore =
    ((((summary.FAST || 0) * 4 +
      (summary.ACCEPTABLE || 0) * 2 +
      (summary.SLOW || 0) * 1) /
      results.length) *
      100) /
    4;

  console.log(`💚 Database Performance Health: ${healthScore.toFixed(1)}%`);

  if (slowQueries.length > results.length * 0.3) {
    console.log(
      "\\n❌ Performance issues detected! Consider optimizing slow queries."
    );
    process.exit(1);
  } else if (slowQueries.length > 0) {
    console.log(
      "\\n⚠️  Some queries could be optimized, but performance is acceptable."
    );
    process.exit(0);
  } else {
    console.log("\\n🎉 All queries performing well!");
    process.exit(0);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("🚀 Adventure Log Database Performance Analysis");
  console.log("═".repeat(80));
  console.log("");

  try {
    // Test database connection
    await db.$connect();
    console.log("✅ Database connection successful\\n");

    const recommendations = await analyzeIndexes();
    const results = await runPerformanceTests();

    generateReport(results, recommendations);
  } catch (error) {
    console.error("❌ Database analysis failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main();
}
