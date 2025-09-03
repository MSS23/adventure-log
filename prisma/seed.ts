import { PrismaClient, Privacy, UserRole } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create a demo user
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@adventurelog.example" },
    update: {},
    create: {
      email: "demo@adventurelog.example",
      username: "demo_traveler",
      name: "Demo Traveler",
      bio: "Exploring the world one country at a time! 🌍",
      isPublic: true,
      emailVerified: new Date(),
      role: UserRole.USER,
      totalCountriesVisited: 3,
      totalAlbumsCount: 2,
      totalPhotosCount: 5,
      currentStreak: 2,
      longestStreak: 3,
      lastAlbumDate: new Date(),
    },
  });

  console.log("👤 Created demo user:", {
    id: demoUser.id,
    name: demoUser.name,
  });

  // Create 2 albums for the demo user
  const album1 = await prisma.album.upsert({
    where: { id: "demo-album-paris" },
    update: {},
    create: {
      id: "demo-album-paris",
      title: "Paris Adventure",
      description:
        "Exploring the City of Light with its incredible architecture and cuisine.",
      country: "France",
      countryCode: "FR",
      city: "Paris",
      latitude: 48.8566,
      longitude: 2.3522,
      date: new Date("2024-01-15"),
      privacy: Privacy.PUBLIC,
      shareLocation: true,
      tags: "architecture,food,culture",
      userId: demoUser.id,
      viewCount: 42,
      shareCount: 3,
      visitDuration: "5 days",
      weather: "Mild winter, some rain",
      companions: "Solo travel",
    },
  });

  const album2 = await prisma.album.upsert({
    where: { id: "demo-album-tokyo" },
    update: {},
    create: {
      id: "demo-album-tokyo",
      title: "Tokyo Highlights",
      description:
        "Modern meets traditional in this amazing city. Cherry blossoms were just beginning to bloom!",
      country: "Japan",
      countryCode: "JP",
      city: "Tokyo",
      latitude: 35.6762,
      longitude: 139.6503,
      date: new Date("2024-03-20"),
      privacy: Privacy.PUBLIC,
      shareLocation: true,
      tags: "sakura,technology,temples,food",
      userId: demoUser.id,
      viewCount: 87,
      shareCount: 8,
      visitDuration: "1 week",
      weather: "Perfect spring weather",
      companions: "With best friend",
    },
  });

  console.log("📸 Created albums:", {
    album1: album1.title,
    album2: album2.title,
  });

  // Create 5 photos across the albums
  const photos = [
    {
      id: "photo-eiffel-tower",
      url: "https://example.com/photos/eiffel-tower.jpg",
      caption: "The Eiffel Tower at sunset - absolutely magical! 🗼",
      latitude: 48.8584,
      longitude: 2.2945,
      albumId: album1.id,
    },
    {
      id: "photo-louvre-pyramid",
      url: "https://example.com/photos/louvre-pyramid.jpg",
      caption: "The glass pyramid at the Louvre Museum",
      latitude: 48.8606,
      longitude: 2.3376,
      albumId: album1.id,
    },
    {
      id: "photo-tokyo-skytree",
      url: "https://example.com/photos/tokyo-skytree.jpg",
      caption: "Tokyo Skytree dominating the skyline 🏙️",
      latitude: 35.7101,
      longitude: 139.8107,
      albumId: album2.id,
    },
    {
      id: "photo-cherry-blossoms",
      url: "https://example.com/photos/cherry-blossoms.jpg",
      caption:
        "Cherry blossoms in Ueno Park - spring in Tokyo is unbeatable! 🌸",
      latitude: 35.7148,
      longitude: 139.7734,
      albumId: album2.id,
    },
    {
      id: "photo-ramen-bowl",
      url: "https://example.com/photos/ramen-bowl.jpg",
      caption: "The most incredible ramen in a tiny shop in Shibuya 🍜",
      latitude: 35.6598,
      longitude: 139.7006,
      albumId: album2.id,
    },
  ];

  for (const photo of photos) {
    await prisma.albumPhoto.upsert({
      where: { id: photo.id },
      update: {},
      create: photo,
    });
  }

  console.log("📷 Created 5 demo photos across albums");

  // Set cover photos
  await prisma.album.update({
    where: { id: album1.id },
    data: { coverPhotoId: "photo-eiffel-tower" },
  });

  await prisma.album.update({
    where: { id: album2.id },
    data: { coverPhotoId: "photo-cherry-blossoms" },
  });

  // Create some activity records
  const activities = [
    {
      userId: demoUser.id,
      type: "ALBUM_CREATED" as const,
      targetType: "Album",
      targetId: album1.id,
      metadata: JSON.stringify({
        albumTitle: album1.title,
        country: album1.country,
      }),
    },
    {
      userId: demoUser.id,
      type: "PHOTO_UPLOADED" as const,
      targetType: "AlbumPhoto",
      targetId: "photo-eiffel-tower",
      metadata: JSON.stringify({
        albumTitle: album1.title,
        photoCaption: photos[0].caption,
      }),
    },
    {
      userId: demoUser.id,
      type: "ALBUM_CREATED" as const,
      targetType: "Album",
      targetId: album2.id,
      metadata: JSON.stringify({
        albumTitle: album2.title,
        country: album2.country,
      }),
    },
    {
      userId: demoUser.id,
      type: "COUNTRY_VISITED" as const,
      targetType: "Album",
      targetId: album2.id,
      metadata: JSON.stringify({
        country: album2.country,
        countryCode: album2.countryCode,
      }),
    },
  ];

  for (const activity of activities) {
    await prisma.activity.create({ data: activity });
  }

  console.log("📊 Created activity records");

  // Update user stats
  await prisma.user.update({
    where: { id: demoUser.id },
    data: {
      totalCountriesVisited: 2, // France and Japan
      totalAlbumsCount: 2,
      totalPhotosCount: 5,
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log("\nDemo data created:");
  console.log("- User: demo@adventurelog.example (password: demo123)");
  console.log("- Albums: Paris Adventure, Tokyo Highlights");
  console.log("- Photos: 5 photos across albums");
  console.log("- Activities: Album creations, photo uploads, country visits");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
