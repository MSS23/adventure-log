import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { handleApiError, ok, created, badRequest } from "@/lib/http";
import {
  getUserChallenges,
  joinUserToActiveChallenges,
  getChallengeLeaderboard,
} from "@/lib/challenges";
import { challengeJoinSchema } from "@/lib/validations";
import { db } from "@/lib/db";

/**
 * GET /api/gamification/challenges - Get user's challenges or challenge leaderboard
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "active"; // active, leaderboard

    if (type === "leaderboard") {
      const challengeId = searchParams.get("challengeId");
      if (!challengeId) {
        return badRequest("challengeId is required for leaderboard");
      }

      const limit = parseInt(searchParams.get("limit") || "10");
      const leaderboard = await getChallengeLeaderboard(challengeId, limit);
      return ok({ leaderboard });
    }

    // Get user's active challenges
    const challenges = await getUserChallenges(user.id);
    return ok({ challenges });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/gamification/challenges - Join user to challenges or create custom challenge
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "join_active":
        // Join user to all active challenges
        await joinUserToActiveChallenges(user.id);
        return created({ message: "Successfully joined active challenges" });

      case "join_specific":
        const { challengeId } = challengeJoinSchema.parse(body);

        // Check if challenge exists and is active
        const challenge = await db.challenge.findUnique({
          where: { id: challengeId },
        });

        if (!challenge) {
          return badRequest("Challenge not found");
        }

        if (!challenge.isActive || challenge.endDate < new Date()) {
          return badRequest("Challenge is not active");
        }

        // Check if user is already participating
        const existingParticipation = await db.userChallenge.findUnique({
          where: {
            userId_challengeId: {
              userId: user.id,
              challengeId,
            },
          },
        });

        if (existingParticipation) {
          return badRequest("Already participating in this challenge");
        }

        // Join the challenge
        await db.userChallenge.create({
          data: {
            userId: user.id,
            challengeId,
          },
        });

        return created({ message: "Successfully joined challenge" });

      default:
        return badRequest("Invalid action");
    }
  } catch (error) {
    return handleApiError(error);
  }
}
