"use client";

import { Globe, MapPin, Camera, Lock, Eye } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatsProps {
  stats: {
    totalAlbums: number;
    countries: number;
    cities: number;
    totalPhotos: number;
    publicAlbums: number;
    privateAlbums: number;
  };
}

export default function GlobeStats({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Camera className="h-4 w-4 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.totalAlbums}</p>
              <p className="text-xs text-muted-foreground">Albums</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.countries}</p>
              <p className="text-xs text-muted-foreground">Countries</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.cities}</p>
              <p className="text-xs text-muted-foreground">Cities</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Camera className="h-4 w-4 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.totalPhotos}</p>
              <p className="text-xs text-muted-foreground">Photos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-cyan-500" />
            <div>
              <p className="text-2xl font-bold">{stats.publicAlbums}</p>
              <p className="text-xs text-muted-foreground">Public</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Lock className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats.privateAlbums}</p>
              <p className="text-xs text-muted-foreground">Private</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
