// Script to create test albums with real world locations
// Run with: npx tsx scripts/create-test-albums.ts

import { db } from "@/lib/db";
import { getCoordinates } from "@/lib/geocoding";

const testAlbums = [
<<<<<<< HEAD
  { title: "Eiffel Tower Views", country: "France", city: "Paris", description: "Amazing views from the Eiffel Tower" },
  { title: "Times Square Energy", country: "USA", city: "New York", description: "The bustling heart of NYC" },
  { title: "Tokyo Street Photography", country: "Japan", city: "Tokyo", description: "Neon lights and urban life" },
  { title: "Sydney Opera House", country: "Australia", city: "Sydney", description: "Iconic architecture by the harbor" },
  { title: "Dubai Skyline", country: "UAE", city: "Dubai", description: "Modern marvels in the desert" },
  { title: "London Bridge Walk", country: "UK", city: "London", description: "Historic Thames crossing" },
  { title: "Santorini Sunset", country: "Greece", city: "Santorini", description: "Blue domes and white walls" },
  { title: "Rio Carnival", country: "Brazil", city: "Rio de Janeiro", description: "Vibrant celebrations" },
  { title: "Safari Adventure", country: "Kenya", city: "Nairobi", description: "Wildlife photography" },
  { title: "Northern Lights", country: "Iceland", city: "Reykjavik", description: "Aurora borealis magic" },
  { title: "Singapore Gardens", country: "Singapore", city: "Singapore", description: "Gardens by the Bay" },
  { title: "Barcelona Architecture", country: "Spain", city: "Barcelona", description: "Gaudi's masterpieces" },
  { title: "Cairo Pyramids", country: "Egypt", city: "Cairo", description: "Ancient wonders" },
  { title: "Vancouver Mountains", country: "Canada", city: "Vancouver", description: "City meets nature" },
  { title: "Mumbai Markets", country: "India", city: "Mumbai", description: "Colorful street markets" },
=======
  {
    title: "Eiffel Tower Views",
    country: "France",
    city: "Paris",
    description: "Amazing views from the Eiffel Tower",
  },
  {
    title: "Times Square Energy",
    country: "USA",
    city: "New York",
    description: "The bustling heart of NYC",
  },
  {
    title: "Tokyo Street Photography",
    country: "Japan",
    city: "Tokyo",
    description: "Neon lights and urban life",
  },
  {
    title: "Sydney Opera House",
    country: "Australia",
    city: "Sydney",
    description: "Iconic architecture by the harbor",
  },
  {
    title: "Dubai Skyline",
    country: "UAE",
    city: "Dubai",
    description: "Modern marvels in the desert",
  },
  {
    title: "London Bridge Walk",
    country: "UK",
    city: "London",
    description: "Historic Thames crossing",
  },
  {
    title: "Santorini Sunset",
    country: "Greece",
    city: "Santorini",
    description: "Blue domes and white walls",
  },
  {
    title: "Rio Carnival",
    country: "Brazil",
    city: "Rio de Janeiro",
    description: "Vibrant celebrations",
  },
  {
    title: "Safari Adventure",
    country: "Kenya",
    city: "Nairobi",
    description: "Wildlife photography",
  },
  {
    title: "Northern Lights",
    country: "Iceland",
    city: "Reykjavik",
    description: "Aurora borealis magic",
  },
  {
    title: "Singapore Gardens",
    country: "Singapore",
    city: "Singapore",
    description: "Gardens by the Bay",
  },
  {
    title: "Barcelona Architecture",
    country: "Spain",
    city: "Barcelona",
    description: "Gaudi's masterpieces",
  },
  {
    title: "Cairo Pyramids",
    country: "Egypt",
    city: "Cairo",
    description: "Ancient wonders",
  },
  {
    title: "Vancouver Mountains",
    country: "Canada",
    city: "Vancouver",
    description: "City meets nature",
  },
  {
    title: "Mumbai Markets",
    country: "India",
    city: "Mumbai",
    description: "Colorful street markets",
  },
>>>>>>> oauth-upload-fixes
];

async function createTestAlbums() {
  console.log("Creating test albums with real locations...");
<<<<<<< HEAD
  
  try {
    // Get the first user in the database (for testing)
    const user = await db.user.findFirst();
    
=======

  try {
    // Get the first user in the database (for testing)
    const user = await db.user.findFirst();

>>>>>>> oauth-upload-fixes
    if (!user) {
      console.error("No user found in database. Please create a user first.");
      return;
    }
<<<<<<< HEAD
    
    console.log(`Using user: ${user.email}`);
    
    for (const albumData of testAlbums) {
      console.log(`\nCreating album: ${albumData.title}`);
      
      // Get coordinates for the location
      const coordinates = await getCoordinates(albumData.country, albumData.city);
      
      if (!coordinates) {
        console.warn(`Could not geocode ${albumData.city}, ${albumData.country}`);
        continue;
      }
      
      console.log(`  Location: ${albumData.city}, ${albumData.country}`);
      console.log(`  Coordinates: ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`);
      
=======

    console.log(`Using user: ${user.email}`);

    for (const albumData of testAlbums) {
      console.log(`\nCreating album: ${albumData.title}`);

      // Get coordinates for the location
      const coordinates = await getCoordinates(
        albumData.country,
        albumData.city
      );

      if (!coordinates) {
        console.warn(
          `Could not geocode ${albumData.city}, ${albumData.country}`
        );
        continue;
      }

      console.log(`  Location: ${albumData.city}, ${albumData.country}`);
      console.log(
        `  Coordinates: ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`
      );

>>>>>>> oauth-upload-fixes
      // Create the album
      const album = await db.album.create({
        data: {
          title: albumData.title,
          description: albumData.description,
          country: albumData.country,
          city: albumData.city,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          privacy: "PUBLIC",
          tags: "travel,photography,adventure",
          userId: user.id,
          viewCount: Math.floor(Math.random() * 1000),
          shareCount: Math.floor(Math.random() * 100),
        },
      });
<<<<<<< HEAD
      
      console.log(`  ✅ Album created with ID: ${album.id}`);
      
      // Add a small delay to avoid rate limiting on geocoding API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
=======

      console.log(`  ✅ Album created with ID: ${album.id}`);

      // Add a small delay to avoid rate limiting on geocoding API
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

>>>>>>> oauth-upload-fixes
    // Update user statistics
    const albumCount = await db.album.count({ where: { userId: user.id } });
    const countries = await db.album.findMany({
      where: { userId: user.id },
      select: { country: true },
<<<<<<< HEAD
      distinct: ['country'],
    });
    
=======
      distinct: ["country"],
    });

>>>>>>> oauth-upload-fixes
    await db.user.update({
      where: { id: user.id },
      data: {
        totalAlbumsCount: albumCount,
        totalCountriesVisited: countries.length,
      },
    });
<<<<<<< HEAD
    
    console.log("\n✅ Test albums created successfully!");
    console.log(`Total albums: ${albumCount}`);
    console.log(`Countries visited: ${countries.length}`);
    
=======

    console.log("\n✅ Test albums created successfully!");
    console.log(`Total albums: ${albumCount}`);
    console.log(`Countries visited: ${countries.length}`);
>>>>>>> oauth-upload-fixes
  } catch (error) {
    console.error("Error creating test albums:", error);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
<<<<<<< HEAD
createTestAlbums();
=======
createTestAlbums();
>>>>>>> oauth-upload-fixes
