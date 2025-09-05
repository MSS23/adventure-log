import { logger } from "./logger";

export type ModerationResult = "SAFE" | "FLAGGED" | "BLOCKED";

export interface ModerationResponse {
  result: ModerationResult;
  confidence: number;
  categories: string[];
  reason?: string;
}

// Basic content moderation filters
const BLOCKED_WORDS = [
  // Add inappropriate words here - keeping it simple for demo
  "spam",
  "scam",
  "fake",
  "illegal",
  "hate",
  "violence",
  "abuse",
  "offensive",
  "inappropriate",
  "explicit",
  "nsfw",
  "adult",
];

const SUSPICIOUS_PATTERNS = [
  /\b(?:https?:\/\/)?(?:[-\w.])+\.(?:[a-z]{2,})\b/gi, // Suspicious URLs
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card patterns
  /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, // SSN patterns
  /[^\w\s]{5,}/g, // Too many special characters
];

/**
 * Basic text content moderation
 */
export async function moderateText(
  content: string
): Promise<ModerationResponse> {
  try {
    const normalizedContent = content.toLowerCase();
    const categories: string[] = [];
    let confidence = 0;

    // Check for blocked words
    const foundBlockedWords = BLOCKED_WORDS.filter((word) =>
      normalizedContent.includes(word.toLowerCase())
    );

    if (foundBlockedWords.length > 0) {
      categories.push("inappropriate_language");
      confidence += foundBlockedWords.length * 0.3;
    }

    // Check for suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        categories.push("suspicious_content");
        confidence += 0.25;
      }
    }

    // Check for excessive caps (spam indicator)
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5 && content.length > 20) {
      categories.push("spam");
      confidence += 0.2;
    }

    // Check for repetitive content
    const words = content.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
      categories.push("spam");
      confidence += 0.3;
    }

    // Determine result based on confidence
    let result: ModerationResult = "SAFE";
    if (confidence >= 0.8) {
      result = "BLOCKED";
    } else if (confidence >= 0.4) {
      result = "FLAGGED";
    }

    return {
      result,
      confidence: Math.min(confidence, 1),
      categories,
      reason:
        result !== "SAFE"
          ? `Content flagged for: ${categories.join(", ")}`
          : undefined,
    };
  } catch (error) {
    logger.error("Error moderating text content:", { error: error });
    return {
      result: "SAFE",
      confidence: 0,
      categories: ["error"],
      reason: "Moderation service temporarily unavailable",
    };
  }
}

/**
 * Basic image content moderation (placeholder implementation)
 * In production, this would integrate with a service like AWS Rekognition, Google Vision API, etc.
 */
export async function moderateImage(
  imageBuffer: Buffer
): Promise<ModerationResponse> {
  try {
    // Placeholder implementation - in production would use AI moderation service

    // Basic checks based on file size and format
    const categories: string[] = [];
    let confidence = 0;

    // Check file size (very large files might be inappropriate)
    const sizeMB = imageBuffer.length / (1024 * 1024);
    if (sizeMB > 50) {
      categories.push("suspicious_file_size");
      confidence += 0.1;
    }

    // In production, integrate with services like:
    // - AWS Rekognition Content Moderation
    // - Google Cloud Vision API SafeSearch
    // - Microsoft Azure Content Moderator
    // - Clarifai NSFW Detection

    // For now, return safe (placeholder)
    return {
      result: "SAFE",
      confidence: 0,
      categories: [],
    };
  } catch (error) {
    logger.error("Error moderating image content:", { error: error });
    return {
      result: "SAFE",
      confidence: 0,
      categories: ["error"],
      reason: "Image moderation service temporarily unavailable",
    };
  }
}

/**
 * Moderate user profile information
 */
export async function moderateProfile(profile: {
  name?: string;
  bio?: string;
  username?: string;
}): Promise<ModerationResponse> {
  try {
    const textToCheck = [
      profile.name || "",
      profile.bio || "",
      profile.username || "",
    ].join(" ");

    return await moderateText(textToCheck);
  } catch (error) {
    logger.error("Error moderating profile:", { error: error });
    return {
      result: "SAFE",
      confidence: 0,
      categories: ["error"],
    };
  }
}

/**
 * Moderate album and photo content
 */
export async function moderateAlbumContent(content: {
  title?: string;
  description?: string;
  location?: string;
}): Promise<ModerationResponse> {
  try {
    const textToCheck = [
      content.title || "",
      content.description || "",
      content.location || "",
    ].join(" ");

    return await moderateText(textToCheck);
  } catch (error) {
    logger.error("Error moderating album content:", { error: error });
    return {
      result: "SAFE",
      confidence: 0,
      categories: ["error"],
    };
  }
}

/**
 * Check if content requires manual review
 */
export function requiresReview(moderationResult: ModerationResponse): boolean {
  return (
    moderationResult.result === "FLAGGED" ||
    (moderationResult.result === "SAFE" && moderationResult.confidence > 0.3)
  );
}

/**
 * Log moderation action for audit trail
 */
export async function logModerationAction(
  userId: string,
  contentType: string,
  contentId: string,
  result: ModerationResponse,
  action: "approved" | "rejected" | "flagged"
) {
  try {
    logger.info("Content moderation action", {
      userId,
      contentType,
      contentId,
      moderationResult: result,
      action,
      timestamp: new Date().toISOString(),
    });

    // In production, you might want to store this in a dedicated moderation log table
    // await db.moderationLog.create({
    //   data: {
    //     userId,
    //     contentType,
    //     contentId,
    //     result: result.result,
    //     confidence: result.confidence,
    //     categories: result.categories,
    //     action,
    //     reason: result.reason
    //   }
    // });
  } catch (error) {
    logger.error("Error logging moderation action:", { error: error });
  }
}
