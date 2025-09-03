"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  ArrowLeft,
  Star,
  Globe,
  Camera,
  Users,
  Calendar,
  Award,
  Lock,
  CheckCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { PageErrorBoundary } from "@/components/error-boundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "COUNTRIES" | "TRIPS" | "PHOTOS" | "SOCIAL" | "STREAKS" | "SPECIAL";
  requirement: number;
  requirementType:
    | "COUNTRIES_VISITED"
    | "TRIPS_COMPLETED"
    | "PHOTOS_UPLOADED"
    | "FOLLOWERS_COUNT"
    | "LIKES_RECEIVED"
    | "CONSECUTIVE_MONTHS";
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  points: number;
  progress: number;
  completed: boolean;
  unlockedAt: string | null;
}

interface BadgesResponse {
  badges: BadgeData[];
  badgesByCategory: Record<string, BadgeData[]>;
  totalBadges: number;
  unlockedBadges: number;
  _needsSeeding?: boolean;
  _databaseUnavailable?: boolean;
  _error?: boolean;
  message?: string;
}

const categoryIcons = {
  COUNTRIES: Globe,
  TRIPS: Calendar,
  PHOTOS: Camera,
  SOCIAL: Users,
  STREAKS: Star,
  SPECIAL: Award,
};

const rarityTextColors = {
  COMMON: "text-gray-600",
  RARE: "text-blue-600",
  EPIC: "text-purple-600",
  LEGENDARY: "text-yellow-600",
};

function BadgeCard({ badge }: { badge: BadgeData }) {
  const CategoryIcon = categoryIcons[badge.category];
  const progressPercentage = Math.min(
    (badge.progress / badge.requirement) * 100,
    100
  );

  return (
    <Card
      className={`relative transition-all hover:shadow-lg ${
        badge.completed
          ? "ring-2 ring-green-200 bg-green-50/50"
          : "hover:ring-1 hover:ring-primary/20"
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                badge.completed
                  ? "bg-green-100 text-green-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {badge.completed ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <CategoryIcon className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                {badge.name}
                {badge.completed && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Unlocked
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {badge.description}
              </CardDescription>
            </div>
          </div>
          {!badge.completed && (
            <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {badge.progress} / {badge.requirement}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Badge info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`${rarityTextColors[badge.rarity]}`}
            >
              {badge.rarity}
            </Badge>
            <span className="text-muted-foreground">
              +{badge.points} points
            </span>
          </div>
          {badge.completed && badge.unlockedAt && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{new Date(badge.unlockedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BadgesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const {
    data: badgesData,
    isLoading,
    error,
  } = useQuery<BadgesResponse>({
    queryKey: ["badges"],
    queryFn: async () => {
      const response = await fetch("/api/badges");
      if (!response.ok) {
        throw new Error("Failed to fetch badges");
      }
      return response.json();
    },
    enabled: !!session?.user?.id,
  });

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const categories = Object.keys(badgesData?.badgesByCategory || {}) as Array<
    keyof typeof categoryIcons
  >;

  return (
    <PageErrorBoundary pageTitle="Badges">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center mb-8">
          <Link
            href="/dashboard"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center">
              <Trophy className="h-8 w-8 mr-3 text-primary" />
              Achievements
            </h1>
            <p className="text-muted-foreground">
              Track your travel achievements and unlock special badges
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        {badgesData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex items-center">
                  <Trophy className="h-8 w-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">
                      {badgesData.unlockedBadges}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Badges Unlocked
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex items-center">
                  <Star className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">
                      {badgesData.badges
                        .filter((b) => b.completed)
                        .reduce((sum, b) => sum + b.points, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Points
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex items-center">
                  <Award className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        (badgesData.unlockedBadges / badgesData.totalBadges) *
                          100
                      )}
                      %
                    </p>
                    <p className="text-xs text-muted-foreground">Completion</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {error ? (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                Unable to Load Badges
              </h3>
              <p className="text-muted-foreground mb-4">
                We could not fetch your achievements. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : badgesData &&
          (badgesData._needsSeeding ||
            badgesData._databaseUnavailable ||
            badgesData._error) ? (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-orange-600 opacity-50" />
              <h3 className="text-lg font-semibold mb-2 text-orange-900">
                {badgesData._needsSeeding
                  ? "Setting Up Badges System"
                  : badgesData._databaseUnavailable
                    ? "Database Unavailable"
                    : "Badges System Issue"}
              </h3>
              <p className="text-orange-700 mb-4">
                {badgesData.message ||
                  "The badges system is being initialized. Please check back soon!"}
              </p>
              <div className="space-y-3">
                <Button onClick={() => window.location.reload()}>
                  Check Again
                </Button>
                {process.env.NODE_ENV === "development" && (
                  <div className="mt-4 p-4 bg-orange-100 rounded-lg text-left">
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-orange-900">
                        Development Debug Info
                      </summary>
                      <pre className="mt-2 text-xs text-orange-800 overflow-auto">
                        {JSON.stringify(badgesData, null, 2)}
                      </pre>
                    </details>
                    <div className="mt-2 text-sm text-orange-700">
                      <p>💡 To fix this issue:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>
                          Run:{" "}
                          <code className="bg-orange-200 px-1 rounded">
                            npm run db:seed
                          </code>
                        </li>
                        <li>
                          Or visit:{" "}
                          <code className="bg-orange-200 px-1 rounded">
                            /api/health/db
                          </code>{" "}
                          for diagnosis
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : !badgesData || badgesData.badges.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                No Badges Available Yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Start your adventure by creating albums and uploading photos to
                unlock your first achievements!
              </p>
              <Button asChild>
                <Link href="/albums/new">
                  <Camera className="h-4 w-4 mr-2" />
                  Create Your First Album
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-7">
              <TabsTrigger value="all">All Badges</TabsTrigger>
              <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
              <TabsTrigger value="locked">In Progress</TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="hidden lg:flex"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badgesData.badges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="unlocked" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badgesData.badges
                  .filter((badge) => badge.completed)
                  .map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
              </div>
              {badgesData.badges.filter((badge) => badge.completed).length ===
                0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Unlocked Badges Yet
                    </h3>
                    <p className="text-muted-foreground">
                      Start your travel journey to unlock your first
                      achievements!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="locked" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badgesData.badges
                  .filter((badge) => !badge.completed && badge.progress > 0)
                  .map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
              </div>
              {badgesData.badges.filter(
                (badge) => !badge.completed && badge.progress > 0
              ).length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Badges in Progress
                    </h3>
                    <p className="text-muted-foreground">
                      Create albums and add photos to start making progress on
                      badges!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {categories.map((category) => (
              <TabsContent
                key={category}
                value={category}
                className="space-y-6 mt-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(badgesData.badgesByCategory[category] || []).map(
                    (badge) => (
                      <BadgeCard key={badge.id} badge={badge} />
                    )
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </PageErrorBoundary>
  );
}
