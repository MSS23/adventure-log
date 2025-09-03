import { NextRequest } from "next/server";
import { getCurrentUser, rateLimit } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { handleApiError, ok, created, badRequest } from "@/lib/http";
import { friendRequestSchema } from "@/lib/validations";

/**
 * GET /api/social/friends - Get friend requests and friends list
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all"; // all, requests, friends, sent, received
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const skip = (page - 1) * limit;

    const data: any = {};

    if (type === "all" || type === "requests") {
      // Get incoming friend requests (received)
      const receivedRequests = await db.friendRequest.findMany({
        where: {
          receiverId: user.id,
          status: "PENDING",
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              isPublic: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        ...(type === "requests" ? { skip, take: limit } : {}),
      });

      data.receivedRequests = receivedRequests;
    }

    if (type === "all" || type === "sent") {
      // Get outgoing friend requests (sent)
      const sentRequests = await db.friendRequest.findMany({
        where: {
          senderId: user.id,
          status: "PENDING",
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              isPublic: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        ...(type === "sent" ? { skip, take: limit } : {}),
      });

      data.sentRequests = sentRequests;
    }

    if (type === "all" || type === "friends") {
      // Get accepted friends (both directions)
      const friendships = await db.friendRequest.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: user.id }, { receiverId: user.id }],
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              isPublic: true,
              totalAlbumsCount: true,
              totalPhotosCount: true,
              totalCountriesVisited: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              isPublic: true,
              totalAlbumsCount: true,
              totalPhotosCount: true,
              totalCountriesVisited: true,
            },
          },
        },
        orderBy: { respondedAt: "desc" },
        ...(type === "friends" ? { skip, take: limit } : {}),
      });

      // Map to friend objects (the other person in each friendship)
      data.friends = friendships.map((friendship) => {
        const friend =
          friendship.senderId === user.id
            ? friendship.receiver
            : friendship.sender;

        return {
          ...friend,
          friendshipId: friendship.id,
          friendsSince: friendship.respondedAt || friendship.createdAt,
        };
      });
    }

    // Add counts for all type
    if (type === "all") {
      const counts = await Promise.all([
        db.friendRequest.count({
          where: { receiverId: user.id, status: "PENDING" },
        }),
        db.friendRequest.count({
          where: { senderId: user.id, status: "PENDING" },
        }),
        db.friendRequest.count({
          where: {
            status: "ACCEPTED",
            OR: [{ senderId: user.id }, { receiverId: user.id }],
          },
        }),
      ]);

      data.counts = {
        receivedRequests: counts[0],
        sentRequests: counts[1],
        friends: counts[2],
      };
    }

    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/social/friends - Send or manage friend requests
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    // Rate limiting - 20 friend actions per minute
    await rateLimit("follows", user.id);

    const body = await request.json();
    const validatedData = friendRequestSchema.parse(body);
    const { receiverId, action } = validatedData;

    // Can't friend yourself
    if (receiverId === user.id) {
      return badRequest("Cannot send friend request to yourself");
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: receiverId },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        isPublic: true,
      },
    });

    if (!targetUser) {
      return badRequest("User not found");
    }

    // Find existing friend request (either direction)
    const existingRequest = await db.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: user.id, receiverId },
          { senderId: receiverId, receiverId: user.id },
        ],
      },
    });

    switch (action) {
      case "send":
        if (existingRequest) {
          if (existingRequest.status === "ACCEPTED") {
            return badRequest("Already friends with this user");
          }
          if (existingRequest.status === "PENDING") {
            return badRequest("Friend request already pending");
          }
          if (
            existingRequest.status === "DECLINED" &&
            existingRequest.senderId === user.id
          ) {
            return badRequest(
              "Friend request was declined. Wait before sending again."
            );
          }
        }

        // Create new friend request
        const newRequest = await db.friendRequest.create({
          data: {
            senderId: user.id,
            receiverId,
            status: "PENDING",
          },
          include: {
            receiver: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        });

        // Create notification for receiver
        await db.notification.create({
          data: {
            userId: receiverId,
            type: "FRIEND_REQUEST",
            title: "Friend Request",
            content: `${user.name} sent you a friend request`,
            metadata: JSON.stringify({
              senderId: user.id,
              senderName: user.name,
              senderImage: user.image,
              requestId: newRequest.id,
            }),
          },
        });

        return created({
          message: "Friend request sent successfully",
          request: newRequest,
        });

      case "accept":
        if (!existingRequest) {
          return badRequest("No friend request found");
        }
        if (existingRequest.receiverId !== user.id) {
          return badRequest("You can only accept friend requests sent to you");
        }
        if (existingRequest.status !== "PENDING") {
          return badRequest("Friend request is not pending");
        }

        // Accept the request
        const acceptedRequest = await db.friendRequest.update({
          where: { id: existingRequest.id },
          data: {
            status: "ACCEPTED",
            respondedAt: new Date(),
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        });

        // Create notification for sender
        await db.notification.create({
          data: {
            userId: existingRequest.senderId,
            type: "FRIEND_REQUEST",
            title: "Friend Request Accepted",
            content: `${user.name} accepted your friend request`,
            metadata: JSON.stringify({
              accepterId: user.id,
              accepterName: user.name,
              accepterImage: user.image,
              requestId: acceptedRequest.id,
            }),
          },
        });

        return ok({
          message: "Friend request accepted",
          request: acceptedRequest,
        });

      case "decline":
        if (!existingRequest) {
          return badRequest("No friend request found");
        }
        if (existingRequest.receiverId !== user.id) {
          return badRequest("You can only decline friend requests sent to you");
        }
        if (existingRequest.status !== "PENDING") {
          return badRequest("Friend request is not pending");
        }

        // Decline the request
        await db.friendRequest.update({
          where: { id: existingRequest.id },
          data: {
            status: "DECLINED",
            respondedAt: new Date(),
          },
        });

        return ok({ message: "Friend request declined" });

      case "cancel":
        if (!existingRequest) {
          return badRequest("No friend request found");
        }
        if (existingRequest.senderId !== user.id) {
          return badRequest("You can only cancel friend requests you sent");
        }
        if (existingRequest.status !== "PENDING") {
          return badRequest("Friend request is not pending");
        }

        // Cancel (delete) the request
        await db.friendRequest.delete({
          where: { id: existingRequest.id },
        });

        return ok({ message: "Friend request cancelled" });

      default:
        return badRequest(
          "Invalid action. Must be: send, accept, decline, or cancel"
        );
    }
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/social/friends - Remove a friendship
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get("friendId");

    if (!friendId) {
      return badRequest("friendId is required");
    }

    // Find the friendship (either direction)
    const friendship = await db.friendRequest.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: user.id, receiverId: friendId },
          { senderId: friendId, receiverId: user.id },
        ],
      },
    });

    if (!friendship) {
      return badRequest("Friendship not found");
    }

    // Delete the friendship
    await db.friendRequest.delete({
      where: { id: friendship.id },
    });

    return ok({ message: "Friendship removed successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
