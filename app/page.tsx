"use client";

import { Globe, Camera, Users, Trophy, Map, Plane } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function Home() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session) {
      window.location.href = "/dashboard";
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (session) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto">
        <div className="flex justify-center mb-6">
          <Globe className="h-20 w-20 text-primary" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Adventure Log
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Document your travels, share your adventures, and explore the world
          through an interactive 3D globe. Connect with fellow travelers and
          showcase your journey.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/auth/signup">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth/signin">Sign In</Link>
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Choose Adventure Log?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Globe className="h-8 w-8 text-primary mb-2" />
              <CardTitle>3D Globe Visualization</CardTitle>
              <CardDescription>
                Explore your travels on an interactive 3D globe with country
                markers and travel paths
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Camera className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Photo Albums</CardTitle>
              <CardDescription>
                Create beautiful photo albums for each destination with location
                tagging and captions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Plane className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Trip Journals</CardTitle>
              <CardDescription>
                Document your adventures with rich text journals, photos, and
                trip details
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Social Features</CardTitle>
              <CardDescription>
                Follow friends, share your adventures, and discover new
                destinations through others
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Trophy className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Travel Achievements</CardTitle>
              <CardDescription>
                Earn badges and complete challenges as you explore more
                countries and create content
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Map className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Travel Statistics</CardTitle>
              <CardDescription>
                Track your travel stats including countries visited, trips
                taken, and photos uploaded
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-20 text-center bg-muted/50 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4">
          Ready to Start Your Adventure Log?
        </h2>
        <p className="text-muted-foreground mb-6">
          Join thousands of travelers documenting their journeys around the
          world
        </p>
        <Button size="lg" asChild>
          <Link href="/auth/signup">Create Your Account</Link>
        </Button>
      </div>
    </div>
  );
}
