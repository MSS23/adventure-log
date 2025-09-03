"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  UserCheck,
  UserPlus,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Mail,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  image: string | null;
  isPublic: boolean;
  totalAlbumsCount?: number;
  totalPhotosCount?: number;
  totalCountriesVisited?: number;
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  respondedAt: string | null;
  sender?: UserProfile;
  receiver?: UserProfile;
}

interface Friend extends UserProfile {
  friendshipId: string;
  friendsSince: string;
}

interface FriendsData {
  receivedRequests?: FriendRequest[];
  sentRequests?: FriendRequest[];
  friends?: Friend[];
  counts?: {
    receivedRequests: number;
    sentRequests: number;
    friends: number;
  };
}

export default function FriendRequestsManager() {
  const [activeTab, setActiveTab] = useState("received");
  const queryClient = useQueryClient();

  // Fetch friend requests and friends data
  const { data, isLoading } = useQuery<FriendsData>({
    queryKey: ["social-friends"],
    queryFn: async () => {
      const response = await fetch("/api/social/friends?type=all");
      if (!response.ok) {
        throw new Error("Failed to fetch friends data");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Handle friend request actions
  const friendActionMutation = useMutation({
    mutationFn: async ({
      receiverId,
      action,
    }: {
      receiverId: string;
      action: "send" | "accept" | "decline" | "cancel";
    }) => {
      const response = await fetch("/api/social/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, action }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to perform action");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["social-friends"] });
      const actionMessages = {
        send: "Friend request sent",
        accept: "Friend request accepted",
        decline: "Friend request declined",
        cancel: "Friend request cancelled",
      };
      toast.success(actionMessages[variables.action]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Action failed");
    },
  });

  // Remove friendship
  const removeFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const response = await fetch(`/api/social/friends?friendId=${friendId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove friend");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-friends"] });
      toast.success("Friend removed");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove friend"
      );
    },
  });

  const handleFriendAction = (
    receiverId: string,
    action: "send" | "accept" | "decline" | "cancel"
  ) => {
    friendActionMutation.mutate({ receiverId, action });
  };

  const handleRemoveFriend = (friendId: string) => {
    if (
      confirm(
        "Are you sure you want to remove this friend? This action cannot be undone."
      )
    ) {
      removeFriendMutation.mutate(friendId);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-2">Loading friend requests...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const receivedRequests = data?.receivedRequests || [];
  const sentRequests = data?.sentRequests || [];
  const friends = data?.friends || [];
  const counts = data?.counts;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Friend Management
        </CardTitle>
        <CardDescription>
          Manage your friend requests and connections
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="received" className="relative">
              Received
              {counts?.receivedRequests > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
                >
                  {counts.receivedRequests > 99
                    ? "99+"
                    : counts.receivedRequests}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="relative">
              Sent
              {counts?.sentRequests > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
                >
                  {counts.sentRequests}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="friends" className="relative">
              Friends
              {counts?.friends > 0 && (
                <Badge
                  variant="outline"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
                >
                  {counts.friends}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Received Friend Requests */}
          <TabsContent value="received" className="mt-4">
            {receivedRequests.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No pending friend requests
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  When someone sends you a friend request, it will appear here
                </p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {receivedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.sender?.image || ""} />
                          <AvatarFallback>
                            {request.sender?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {request.sender?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{request.sender?.username}
                          </p>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeAgo(request.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleFriendAction(request.senderId, "accept")
                          }
                          disabled={friendActionMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleFriendAction(request.senderId, "decline")
                          }
                          disabled={friendActionMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Sent Friend Requests */}
          <TabsContent value="sent" className="mt-4">
            {sentRequests.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No pending sent requests
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Friend requests you send will appear here
                </p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {sentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.receiver?.image || ""} />
                          <AvatarFallback>
                            {request.receiver?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">
                            {request.receiver?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{request.receiver?.username}
                          </p>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>Sent {formatTimeAgo(request.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          Pending
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleFriendAction(request.receiverId, "cancel")
                          }
                          disabled={friendActionMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Friends List */}
          <TabsContent value="friends" className="mt-4">
            {friends.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No friends yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start connecting with fellow travelers
                </p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.image || ""} />
                          <AvatarFallback>
                            {friend.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{friend.name}</p>
                          <p className="text-sm text-muted-foreground">
                            @{friend.username}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            {friend.totalCountriesVisited !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {friend.totalCountriesVisited} countries
                              </span>
                            )}
                            {friend.totalAlbumsCount !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {friend.totalAlbumsCount} albums
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                            <UserCheck className="h-3 w-3" />
                            <span>
                              Friends since {formatTimeAgo(friend.friendsSince)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <User className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveFriend(friend.id)}
                            className="text-destructive"
                            disabled={removeFriendMutation.isPending}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Remove Friend
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
