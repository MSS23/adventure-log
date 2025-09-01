import { PrismaClient, BadgeCategory, BadgeRarity, BadgeRequirementType } from "@prisma/client";

const db = new PrismaClient();

async function seedDatabase() {
  console.log("🌱 Starting database seed...");

  try {
    // Seed badges first (no dependencies)
    console.log("📋 Seeding badges...");
    await seedBadges();

    // Check if any users exist, if not create demo user for testing
    const userCount = await db.user.count();
    if (userCount === 0) {
      console.log("👤 Creating demo user...");
      await createDemoUser();
    } else {
      console.log(`📊 Found ${userCount} existing users - skipping demo user creation`);
    }

    console.log("✅ Database seed completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

async function seedBadges() {
  const badges = [
    // Trip/Album Badges
    {
      name: "First Steps",
      description: "Complete your first album",
      category: BadgeCategory.TRIPS,
      rarity: BadgeRarity.COMMON,
      icon: "/badges/first-steps.png",
      requirement: 1,
      requirementType: BadgeRequirementType.TRIPS_COMPLETED,
    },
    {
      name: "Wanderer",
      description: "Create 5 albums",
      category: BadgeCategory.TRIPS, 
      rarity: BadgeRarity.COMMON,
      icon: "/badges/wanderer.png",
      requirement: 5,
      requirementType: BadgeRequirementType.TRIPS_COMPLETED,
    },
    {
      name: "Globe Trotter",
      description: "Visit 3 different countries",
      category: BadgeCategory.COUNTRIES,
      rarity: BadgeRarity.RARE,
      icon: "/badges/globe-trotter.png",
      requirement: 3,
      requirementType: BadgeRequirementType.COUNTRIES_VISITED,
    },
    {
      name: "World Explorer",
      description: "Visit 10 different countries",
      category: BadgeCategory.COUNTRIES,
      rarity: BadgeRarity.LEGENDARY,
      icon: "/badges/world-explorer.png",
      requirement: 10,
      requirementType: BadgeRequirementType.COUNTRIES_VISITED,
    },

    // Social Badges
    {
      name: "Social Butterfly",
      description: "Get 5 followers",
      category: BadgeCategory.SOCIAL,
      rarity: BadgeRarity.COMMON,
      icon: "/badges/social-butterfly.png",
      requirement: 5,
      requirementType: BadgeRequirementType.FOLLOWERS_COUNT,
    },
    {
      name: "Popular",
      description: "Get 25 followers",
      category: BadgeCategory.SOCIAL,
      rarity: BadgeRarity.RARE,
      icon: "/badges/popular.png",
      requirement: 25,
      requirementType: BadgeRequirementType.FOLLOWERS_COUNT,
    },
    {
      name: "Influencer",
      description: "Get 100 likes across all content",
      category: BadgeCategory.SOCIAL,
      rarity: BadgeRarity.EPIC,
      icon: "/badges/influencer.png",
      requirement: 100,
      requirementType: BadgeRequirementType.LIKES_RECEIVED,
    },

    // Photo Badges
    {
      name: "Photographer",
      description: "Upload 50 photos",
      category: BadgeCategory.PHOTOS,
      rarity: BadgeRarity.RARE,
      icon: "/badges/photographer.png",
      requirement: 50,
      requirementType: BadgeRequirementType.PHOTOS_UPLOADED,
    },
    {
      name: "Storyteller",
      description: "Create albums for 6 consecutive months",
      category: BadgeCategory.STREAKS, 
      rarity: BadgeRarity.RARE,
      icon: "/badges/storyteller.png",
      requirement: 6,
      requirementType: BadgeRequirementType.CONSECUTIVE_MONTHS,
    },
    {
      name: "Early Bird",
      description: "One of the first 100 users",
      category: BadgeCategory.SPECIAL,
      rarity: BadgeRarity.LEGENDARY,
      icon: "/badges/early-bird.png",
      requirement: 1,
      requirementType: BadgeRequirementType.TRIPS_COMPLETED, // Special case handled in app logic
    },
  ];

  for (const badge of badges) {
    await db.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    });
  }

  console.log(`✅ Seeded ${badges.length} badges`);
}

async function createDemoUser() {
  // Only create demo user in development or if explicitly requested
  if (process.env.NODE_ENV === 'production' && !process.env.CREATE_DEMO_USER) {
    console.log("⏭️  Skipping demo user creation in production");
    return;
  }

  const demoUser = await db.user.create({
    data: {
      email: "demo@adventurelog.app",
      name: "Demo User",
      username: "demo_user",
      bio: "Welcome to Adventure Log! This is a demo account to showcase the platform features.",
      isPublic: true,
      image: "/icons/icon-192x192.png",
    },
  });

  // Create a sample album for the demo user
  await db.album.create({
    data: {
      userId: demoUser.id,
      title: "Welcome to Adventure Log",
      description: "This is your first album! Start exploring the world and logging your adventures.",
      country: "United States",
      city: "San Francisco",
      latitude: 37.7749,
      longitude: -122.4194,
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      privacy: "PUBLIC",
      tags: "demo,welcome,first-album",
      visitDuration: "3 days",
    },
  });

  console.log("✅ Created demo user and sample album");
}

// Main execution
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("🎉 Seed script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seed script failed:", error);
      process.exit(1);
    });
}

export { seedDatabase, seedBadges, createDemoUser };