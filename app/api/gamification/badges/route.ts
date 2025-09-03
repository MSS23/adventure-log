import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { handleApiError, ok } from "@/lib/http";
import {
  getUserBadgeProgress,
  getUserBadgePoints,
  getBadgeLeaderboard,
} from "@/lib/badges";

/**
 * GET /api/gamification/badges - Get user's badge progress and leaderboard
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "progress"; // progress, leaderboard, points

    switch (type) {
      case "progress":
        const badgeProgress = await getUserBadgeProgress(user.id);
        return ok({ badges: badgeProgress });

      case "points":
        const totalPoints = await getUserBadgePoints(user.id);
        return ok({ totalPoints });

      case "leaderboard":
        const limit = parseInt(searchParams.get("limit") || "10");
        const leaderboard = await getBadgeLeaderboard(limit);
        return ok({ leaderboard });

      default:
        return ok({ message: "Invalid type parameter" });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
