"use client";

import { Search, Filter, Calendar, Shield, Route, Globe2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
<<<<<<< HEAD
import { getContinentsFromAlbums, getContinentDisplayName, getCountryContinent } from "@/lib/continent-mapping";
=======
import {
  getContinentsFromAlbums,
  getContinentDisplayName,
  getCountryContinent,
} from "@/lib/continent-mapping";
>>>>>>> oauth-upload-fixes

interface Filters {
  year: string | null;
  privacy: string;
  search: string;
  continent: string | null;
}

interface Album {
  id: string;
  title: string;
  country: string;
  city?: string;
  privacy: "PUBLIC" | "FRIENDS_ONLY" | "PRIVATE";
  date?: string;
  createdAt: string;
}

interface FiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  albums: Album[];
  showRoutes?: boolean;
  onShowRoutesChange?: (showRoutes: boolean) => void;
}

export default function GlobeControls({
  filters,
  onFiltersChange,
  albums,
  showRoutes = false,
  onShowRoutesChange,
}: FiltersProps) {
  // Get unique years from albums based on trip dates
  const years = [
    ...new Set(
      albums.map((a) =>
        new Date(a.date || a.createdAt).getFullYear().toString()
      )
    ),
  ]
    .sort()
    .reverse();

  // Get unique continents from albums
  const continents = getContinentsFromAlbums(albums);

  const handleReset = () => {
    onFiltersChange({
      year: null,
      privacy: "all",
      search: "",
      continent: null,
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, country, or city..."
                value={filters.search}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value })
                }
                className="pl-10"
              />
            </div>
          </div>

          {/* Year filter */}
          <div className="w-full lg:w-48">
            <Select
              value={filters.year || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  year: value === "all" ? null : value,
                })
              }
            >
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Continent filter */}
          <div className="w-full lg:w-48">
            <Select
              value={filters.continent || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  continent: value === "all" ? null : value,
                })
              }
            >
              <SelectTrigger>
                <Globe2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select continent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Continents</SelectItem>
                {continents.map((continent) => (
                  <SelectItem key={continent} value={continent}>
                    {getContinentDisplayName(continent)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Privacy filter */}
          <div className="w-full lg:w-48">
            <Select
              value={filters.privacy}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, privacy: value })
              }
            >
              <SelectTrigger>
                <Shield className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Privacy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Albums</SelectItem>
                <SelectItem value="PUBLIC">Public Only</SelectItem>
                <SelectItem value="FRIENDS_ONLY">Friends Only</SelectItem>
                <SelectItem value="PRIVATE">Private Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Travel Lines Toggle */}
          {onShowRoutesChange && (
            <Button
              variant={showRoutes ? "default" : "outline"}
              onClick={() => onShowRoutesChange(!showRoutes)}
              className="w-full lg:w-auto"
            >
              <Route className="h-4 w-4 mr-2" />
              {showRoutes ? "Hide Routes" : "Show Routes"}
            </Button>
          )}

          {/* Reset button */}
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full lg:w-auto"
          >
            <Filter className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
        </div>

        {/* Active filters summary */}
<<<<<<< HEAD
        {(filters.search || filters.year || filters.privacy !== "all" || filters.continent) && (
=======
        {(filters.search ||
          filters.year ||
          filters.privacy !== "all" ||
          filters.continent) && (
>>>>>>> oauth-upload-fixes
          <div className="mt-4 text-sm text-muted-foreground">
            Showing{" "}
            {
              albums.filter((album) => {
                if (
                  filters.year &&
                  new Date(album.date || album.createdAt)
                    .getFullYear()
                    .toString() !== filters.year
                )
                  return false;
                if (
                  filters.privacy !== "all" &&
                  album.privacy !== filters.privacy
                )
                  return false;
                if (
                  filters.continent &&
                  getCountryContinent(album.country) !== filters.continent
                )
                  return false;
                if (
                  filters.search &&
                  !album.title
                    .toLowerCase()
                    .includes(filters.search.toLowerCase()) &&
                  !album.country
                    ?.toLowerCase()
                    .includes(filters.search.toLowerCase()) &&
                  !album.city
                    ?.toLowerCase()
                    .includes(filters.search.toLowerCase())
                )
                  return false;
                return true;
              }).length
            }{" "}
            of {albums.length} albums
          </div>
        )}
      </CardContent>
    </Card>
  );
}
