// Geocoding utilities for converting location names to coordinates

import { logger } from "./logger";

interface GeocodingResult {
  lat: number;
  lng: number;
  display_name?: string;
  country?: string;
  city?: string;
  state?: string;
}

// Cache for geocoding results to avoid repeated API calls
const geocodingCache = new Map<string, GeocodingResult>();

/**
 * Geocode a location using OpenStreetMap's Nominatim service
 * This is a free service with rate limiting (1 request per second)
 */
export async function geocodeLocation(
  country: string,
  city?: string
): Promise<GeocodingResult | null> {
  // Create cache key
  const cacheKey = `${country}-${city || ""}`.toLowerCase();

  // Check cache first
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  try {
    // Build search query
    const query = city ? `${city}, ${country}` : country;
    const encodedQuery = encodeURIComponent(query);

    // Use Nominatim API (free OpenStreetMap geocoding)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "AdventureLog/1.0", // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      logger.error("Geocoding API error:", response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.length === 0) {
      logger.warn(`No coordinates found for: ${query}`);
      return null;
    }

    const result: GeocodingResult = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
      country,
      city,
    };

    // Cache the result
    geocodingCache.set(cacheKey, result);

    return result;
  } catch (error) {
    logger.error("Geocoding error:", { error: error });
    return null;
  }
}

/**
 * Get coordinates for major cities and countries
 * Fallback for common locations to avoid API calls
 */
export const commonLocations: Record<string, GeocodingResult> = {
  // Major World Cities
  "new york-usa": {
    lat: 40.7128,
    lng: -74.006,
    city: "New York",
    country: "USA",
  },
  "london-uk": { lat: 51.5074, lng: -0.1278, city: "London", country: "UK" },
  "paris-france": {
    lat: 48.8566,
    lng: 2.3522,
    city: "Paris",
    country: "France",
  },
  "tokyo-japan": {
    lat: 35.6762,
    lng: 139.6503,
    city: "Tokyo",
    country: "Japan",
  },
  "sydney-australia": {
    lat: -33.8688,
    lng: 151.2093,
    city: "Sydney",
    country: "Australia",
  },
  "dubai-uae": { lat: 25.2048, lng: 55.2708, city: "Dubai", country: "UAE" },
  "singapore-singapore": {
    lat: 1.3521,
    lng: 103.8198,
    city: "Singapore",
    country: "Singapore",
  },
  "hong kong-china": {
    lat: 22.3193,
    lng: 114.1694,
    city: "Hong Kong",
    country: "China",
  },
  "los angeles-usa": {
    lat: 34.0522,
    lng: -118.2437,
    city: "Los Angeles",
    country: "USA",
  },
  "toronto-canada": {
    lat: 43.6532,
    lng: -79.3832,
    city: "Toronto",
    country: "Canada",
  },
  "berlin-germany": {
    lat: 52.52,
    lng: 13.405,
    city: "Berlin",
    country: "Germany",
  },
  "moscow-russia": {
    lat: 55.7558,
    lng: 37.6173,
    city: "Moscow",
    country: "Russia",
  },
  "mumbai-india": {
    lat: 19.076,
    lng: 72.8777,
    city: "Mumbai",
    country: "India",
  },
  "beijing-china": {
    lat: 39.9042,
    lng: 116.4074,
    city: "Beijing",
    country: "China",
  },
  "cairo-egypt": {
    lat: 30.0444,
    lng: 31.2357,
    city: "Cairo",
    country: "Egypt",
  },
  "rio de janeiro-brazil": {
    lat: -22.9068,
    lng: -43.1729,
    city: "Rio de Janeiro",
    country: "Brazil",
  },
  "cape town-south africa": {
    lat: -33.9249,
    lng: 18.4241,
    city: "Cape Town",
    country: "South Africa",
  },
  "bangkok-thailand": {
    lat: 13.7563,
    lng: 100.5018,
    city: "Bangkok",
    country: "Thailand",
  },
  "barcelona-spain": {
    lat: 41.3851,
    lng: 2.1734,
    city: "Barcelona",
    country: "Spain",
  },
  "rome-italy": { lat: 41.9028, lng: 12.4964, city: "Rome", country: "Italy" },

  // Countries (capital city coordinates)
  usa: { lat: 38.8951, lng: -77.0364, country: "USA" },
  uk: { lat: 51.5074, lng: -0.1278, country: "UK" },
  "united kingdom": { lat: 51.5074, lng: -0.1278, country: "United Kingdom" },
  france: { lat: 48.8566, lng: 2.3522, country: "France" },
  germany: { lat: 52.52, lng: 13.405, country: "Germany" },
  italy: { lat: 41.9028, lng: 12.4964, country: "Italy" },
  spain: { lat: 40.4168, lng: -3.7038, country: "Spain" },
  portugal: { lat: 38.7223, lng: -9.1393, country: "Portugal" },
  netherlands: { lat: 52.3676, lng: 4.9041, country: "Netherlands" },
  belgium: { lat: 50.8503, lng: 4.3517, country: "Belgium" },
  switzerland: { lat: 46.9479, lng: 7.4474, country: "Switzerland" },
  austria: { lat: 48.2082, lng: 16.3738, country: "Austria" },
  poland: { lat: 52.2297, lng: 21.0122, country: "Poland" },
  greece: { lat: 37.9838, lng: 23.7275, country: "Greece" },
  turkey: { lat: 39.9334, lng: 32.8597, country: "Turkey" },
  russia: { lat: 55.7558, lng: 37.6173, country: "Russia" },
  ukraine: { lat: 50.4501, lng: 30.5234, country: "Ukraine" },
  india: { lat: 28.6139, lng: 77.209, country: "India" },
  china: { lat: 39.9042, lng: 116.4074, country: "China" },
  japan: { lat: 35.6762, lng: 139.6503, country: "Japan" },
  "south korea": { lat: 37.5665, lng: 126.978, country: "South Korea" },
  thailand: { lat: 13.7563, lng: 100.5018, country: "Thailand" },
  vietnam: { lat: 21.0285, lng: 105.8542, country: "Vietnam" },
  indonesia: { lat: -6.2088, lng: 106.8456, country: "Indonesia" },
  malaysia: { lat: 3.139, lng: 101.6869, country: "Malaysia" },
  singapore: { lat: 1.3521, lng: 103.8198, country: "Singapore" },
  philippines: { lat: 14.5995, lng: 120.9842, country: "Philippines" },
  australia: { lat: -35.2809, lng: 149.13, country: "Australia" },
  "new zealand": { lat: -41.2865, lng: 174.7762, country: "New Zealand" },
  canada: { lat: 45.4215, lng: -75.6972, country: "Canada" },
  mexico: { lat: 19.4326, lng: -99.1332, country: "Mexico" },
  brazil: { lat: -15.7975, lng: -47.8919, country: "Brazil" },
  argentina: { lat: -34.6037, lng: -58.3816, country: "Argentina" },
  chile: { lat: -33.4489, lng: -70.6693, country: "Chile" },
  peru: { lat: -12.0464, lng: -77.0428, country: "Peru" },
  colombia: { lat: 4.711, lng: -74.0721, country: "Colombia" },
  egypt: { lat: 30.0444, lng: 31.2357, country: "Egypt" },
  "south africa": { lat: -25.7479, lng: 28.2293, country: "South Africa" },
  kenya: { lat: -1.2921, lng: 36.8219, country: "Kenya" },
  morocco: { lat: 33.9716, lng: -6.8498, country: "Morocco" },
  uae: { lat: 24.4539, lng: 54.3773, country: "UAE" },
  "united arab emirates": {
    lat: 24.4539,
    lng: 54.3773,
    country: "United Arab Emirates",
  },
  "saudi arabia": { lat: 24.7136, lng: 46.6753, country: "Saudi Arabia" },
  israel: { lat: 31.7683, lng: 35.2137, country: "Israel" },
};

/**
 * Get coordinates with fallback to common locations
 */
export async function getCoordinates(
  country: string,
  city?: string
): Promise<GeocodingResult | null> {
  // First check common locations
  const lookupKey = city
    ? `${city}-${country}`.toLowerCase()
    : country.toLowerCase();

  if (commonLocations[lookupKey]) {
    return commonLocations[lookupKey];
  }

  // Fall back to geocoding API
  return await geocodeLocation(country, city);
}

/**
 * Validate coordinates
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}
