"use client";

import { MapPin, Home, ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative mx-auto w-24 h-24 mb-4">
              <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping" />
              <div className="relative w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center">
                <MapPin className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-6xl font-bold text-gray-600 dark:text-gray-400 mb-2">
              404
            </h1>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Location Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Looks like this adventure destination doesn&apos;t exist on our
              map yet.
            </p>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/" className="flex items-center justify-center gap-2">
                <Home className="w-4 h-4" />
                Return Home
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4" />
                View Dashboard
              </Link>
            </Button>

            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Adventure Log - Your travel journey continues
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
