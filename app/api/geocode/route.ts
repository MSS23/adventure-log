import { NextRequest, NextResponse } from "next/server";

import { getCoordinates, validateCoordinates } from "@/lib/geocoding";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { country, city } = body;

    if (!country) {
      return NextResponse.json(
        { error: "Country is required" },
        { status: 400 }
      );
    }

    // Get coordinates from geocoding service
    const coordinates = await getCoordinates(country, city);

    if (!coordinates) {
      return NextResponse.json(
        { error: "Could not find coordinates for the specified location" },
        { status: 404 }
      );
    }

    // Validate the coordinates
    if (!validateCoordinates(coordinates.lat, coordinates.lng)) {
      return NextResponse.json(
        { error: "Invalid coordinates returned from geocoding service" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      display_name: coordinates.display_name,
      country: coordinates.country || country,
      city: coordinates.city || city,
    });
  } catch (error) {
    logger.error("Geocoding API error:", { error: error });
    return NextResponse.json(
      { error: "Failed to geocode location" },
      { status: 500 }
    );
  }
}

// GET endpoint for testing or direct queries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");
    const city = searchParams.get("city");

    if (!country) {
      return NextResponse.json(
        { error: "Country parameter is required" },
        { status: 400 }
      );
    }

    const coordinates = await getCoordinates(country, city || undefined);

    if (!coordinates) {
      return NextResponse.json(
        { error: "Could not find coordinates for the specified location" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      display_name: coordinates.display_name,
      country: coordinates.country || country,
      city: coordinates.city || city,
    });
  } catch (error) {
    logger.error("Geocoding API error:", { error: error });
    return NextResponse.json(
      { error: "Failed to geocode location" },
      { status: 500 }
    );
  }
}
