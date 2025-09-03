import { parse as parseExif } from "exifr";
import { logger } from "./logger";
import type { Privacy } from "@prisma/client";

export interface GPSData {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp?: Date;
}

export interface ExifData {
  gps?: GPSData;
  camera?: {
    make?: string;
    model?: string;
    software?: string;
  };
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  timestamp?: Date;
  [key: string]: any;
}

export interface PrivacySettings {
  albumPrivacy: Privacy;
  shareLocation: boolean;
  userConsent: boolean;
}

/**
 * Extract EXIF data from image buffer with privacy controls
 */
export async function extractExifData(
  buffer: Buffer
): Promise<ExifData | null> {
  try {
    const exifData = await parseExif(buffer, {
      gps: true,
      exif: true,
      iptc: true,
      xmp: true,
      tiff: true,
    });

    if (!exifData) {
      return null;
    }

    const result: ExifData = {};

    // Extract GPS data if available
    if (exifData.latitude && exifData.longitude) {
      result.gps = {
        latitude: exifData.latitude,
        longitude: exifData.longitude,
        altitude: exifData.GPSAltitude,
        timestamp: exifData.GPSTimeStamp
          ? new Date(exifData.GPSTimeStamp)
          : undefined,
      };
    }

    // Extract camera information
    if (exifData.Make || exifData.Model) {
      result.camera = {
        make: exifData.Make,
        model: exifData.Model,
        software: exifData.Software,
      };
    }

    // Extract timestamp
    if (exifData.DateTimeOriginal || exifData.DateTime) {
      result.timestamp = new Date(
        exifData.DateTimeOriginal || exifData.DateTime
      );
    }

    // Extract location metadata (from IPTC/XMP)
    if (exifData.City || exifData.State || exifData.Country) {
      result.location = {
        city: exifData.City,
        state: exifData.State || exifData.Province,
        country: exifData.Country,
      };
    }

    logger.debug("Extracted EXIF data:", {
      hasGPS: !!result.gps,
      hasCamera: !!result.camera,
      hasLocation: !!result.location,
      hasTimestamp: !!result.timestamp,
    });

    return result;
  } catch (error) {
    logger.error("Failed to extract EXIF data:", error);
    return null;
  }
}

/**
 * Determine if GPS data should be stored based on privacy settings
 */
export function shouldStoreGPSData(
  exifData: ExifData | null,
  privacySettings: PrivacySettings
): boolean {
  // No GPS data to store
  if (!exifData?.gps) {
    return false;
  }

  const { albumPrivacy, shareLocation, userConsent } = privacySettings;

  // Never store GPS for private albums
  if (albumPrivacy === "PRIVATE") {
    logger.debug("GPS data not stored: Album is private");
    return false;
  }

  // For friends-only albums, only store if user explicitly consents
  if (albumPrivacy === "FRIENDS_ONLY" && !userConsent) {
    logger.debug(
      "GPS data not stored: Friends-only album without explicit consent"
    );
    return false;
  }

  // For public albums, require both album setting and user consent
  if (albumPrivacy === "PUBLIC") {
    if (!shareLocation) {
      logger.debug("GPS data not stored: Album shareLocation is disabled");
      return false;
    }

    if (!userConsent) {
      logger.debug(
        "GPS data not stored: User did not consent to share location"
      );
      return false;
    }
  }

  logger.debug("GPS data will be stored based on privacy settings");
  return true;
}

/**
 * Create metadata object with privacy-compliant information
 */
export function createPrivacyCompliantMetadata(
  exifData: ExifData | null,
  privacySettings: PrivacySettings,
  originalFilename: string,
  originalSize: number,
  processedSizes: Record<string, string>
): Record<string, any> {
  const metadata: Record<string, any> = {
    originalFilename,
    originalSize,
    processedAt: new Date().toISOString(),
    exifStripped: true, // We always strip EXIF from processed images
    sizes: processedSizes,
  };

  // Add GPS data only if privacy settings allow it
  const shouldIncludeGPS = shouldStoreGPSData(exifData, privacySettings);
  if (shouldIncludeGPS && exifData?.gps) {
    metadata.gps = {
      latitude: exifData.gps.latitude,
      longitude: exifData.gps.longitude,
      altitude: exifData.gps.altitude,
      timestamp: exifData.gps.timestamp?.toISOString(),
    };
    metadata.locationStored = true;
  } else {
    metadata.locationStored = false;
  }

  // Add camera info if available (generally safe to share)
  if (exifData?.camera && (exifData.camera.make || exifData.camera.model)) {
    metadata.camera = {
      make: exifData.camera.make,
      model: exifData.camera.model,
      // Don't include software as it might contain personal info
    };
  }

  // Add timestamp if available (useful for sorting/organizing)
  if (exifData?.timestamp) {
    metadata.capturedAt = exifData.timestamp.toISOString();
  }

  // Add privacy settings for audit trail
  metadata.privacy = {
    albumPrivacy: privacySettings.albumPrivacy,
    shareLocationEnabled: privacySettings.shareLocation,
    userConsented: privacySettings.userConsent,
  };

  return metadata;
}

/**
 * Generate privacy-aware photo caption suggestions based on EXIF data
 */
export function generateCaptionSuggestions(
  exifData: ExifData | null
): string[] {
  const suggestions: string[] = [];

  if (!exifData) {
    return suggestions;
  }

  // Location-based suggestions (only if location data exists)
  if (exifData.location) {
    if (exifData.location.city && exifData.location.country) {
      suggestions.push(
        `📍 ${exifData.location.city}, ${exifData.location.country}`
      );
    } else if (exifData.location.country) {
      suggestions.push(`📍 ${exifData.location.country}`);
    }
  }

  // Time-based suggestions
  if (exifData.timestamp) {
    const date = exifData.timestamp;
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    suggestions.push(`📸 Captured at ${timeStr}`);

    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });
    suggestions.push(`📅 ${dayOfWeek} memories`);
  }

  // Camera-based suggestions
  if (exifData.camera?.make && exifData.camera?.model) {
    suggestions.push(
      `📷 Shot with ${exifData.camera.make} ${exifData.camera.model}`
    );
  }

  return suggestions;
}

/**
 * Validate GPS coordinates for reasonableness
 */
export function validateGPSCoordinates(gps: GPSData): boolean {
  const { latitude, longitude } = gps;

  // Check if coordinates are within valid ranges
  if (latitude < -90 || latitude > 90) {
    logger.warn("Invalid GPS latitude:", latitude);
    return false;
  }

  if (longitude < -180 || longitude > 180) {
    logger.warn("Invalid GPS longitude:", longitude);
    return false;
  }

  // Check for obviously fake coordinates (0,0 is in the ocean off Africa)
  if (latitude === 0 && longitude === 0) {
    logger.warn("GPS coordinates are likely fake (0,0)");
    return false;
  }

  return true;
}

/**
 * Estimate location privacy risk based on GPS precision
 */
export function assessLocationPrivacyRisk(
  gps: GPSData
): "LOW" | "MEDIUM" | "HIGH" {
  // This is a simplified risk assessment
  // In reality, you might check against known sensitive locations

  const { latitude, longitude } = gps;

  // Calculate coordinate precision (rough estimate)
  const latPrecision = latitude.toString().split(".")[1]?.length || 0;
  const lngPrecision = longitude.toString().split(".")[1]?.length || 0;
  const avgPrecision = (latPrecision + lngPrecision) / 2;

  // Higher precision = higher risk (more exact location)
  if (avgPrecision >= 6) return "HIGH"; // ~1 meter precision
  if (avgPrecision >= 4) return "MEDIUM"; // ~100 meter precision
  return "LOW"; // ~10km+ precision
}

/**
 * Privacy audit log entry
 */
export interface PrivacyAuditEntry {
  userId: string;
  albumId: string;
  photoId: string;
  action: "GPS_STORED" | "GPS_STRIPPED" | "EXIF_STRIPPED";
  reason: string;
  privacySettings: PrivacySettings;
  timestamp: Date;
}

/**
 * Log privacy-related actions for audit trail
 */
export function logPrivacyAction(entry: PrivacyAuditEntry): void {
  logger.info("Privacy action logged:", {
    userId: entry.userId,
    albumId: entry.albumId,
    photoId: entry.photoId,
    action: entry.action,
    reason: entry.reason,
    settings: entry.privacySettings,
    timestamp: entry.timestamp.toISOString(),
  });

  // In production, you might want to store this in a separate audit table
  // or send to a dedicated privacy compliance logging service
}
