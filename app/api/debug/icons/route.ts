import { NextRequest, NextResponse } from "next/server";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * GET /api/debug/icons
 *
 * Debug endpoint to check icon file availability
 */
export async function GET(_request: NextRequest) {
  const iconsPath = join(process.cwd(), "public", "icons");

  const results = {
    timestamp: new Date().toISOString(),
    iconsPath,
    directoryExists: false,
    files: [] as any[],
    manifestIcons: [
      "icon-72x72.png",
      "icon-96x96.png",
      "icon-128x128.png",
      "icon-144x144.png",
      "icon-152x152.png",
      "icon-192x192.png",
      "icon-384x384.png",
      "icon-512x512.png",
      "apple-icon-180x180.png",
    ],
    status: "unknown" as string,
    tests: [] as any[],
  };

  try {
    // Check if icons directory exists
    results.directoryExists = existsSync(iconsPath);

    if (results.directoryExists) {
      // List all files in icons directory
      const files = readdirSync(iconsPath);

      results.files = files.map((file) => {
        const filePath = join(iconsPath, file);
        const stats = statSync(filePath);
        return {
          name: file,
          size: stats.size,
          isFile: stats.isFile(),
          mtime: stats.mtime.toISOString(),
        };
      });

      results.tests.push({
        name: "Icons Directory",
        status: "success",
        details: {
          path: iconsPath,
          fileCount: files.length,
        },
      });

      // Check specific manifest icons
      const missingIcons: string[] = [];
      const presentIcons: string[] = [];

      results.manifestIcons.forEach((iconName) => {
        const iconExists = files.includes(iconName);
        if (iconExists) {
          presentIcons.push(iconName);
        } else {
          missingIcons.push(iconName);
        }
      });

      results.tests.push({
        name: "Manifest Icons Check",
        status: missingIcons.length > 0 ? "warning" : "success",
        details: {
          present: presentIcons,
          missing: missingIcons,
          totalRequired: results.manifestIcons.length,
          foundCount: presentIcons.length,
        },
      });

      results.status = missingIcons.length > 0 ? "warning" : "healthy";
    } else {
      results.tests.push({
        name: "Icons Directory",
        status: "error",
        details: {
          error: "Icons directory does not exist",
          path: iconsPath,
        },
      });
      results.status = "error";
    }
  } catch (error) {
    results.tests.push({
      name: "Icon File System Check",
      status: "error",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    results.status = "error";
  }

  // Check if we're running in production (where filesystem might be read-only)
  results.tests.push({
    name: "Environment Check",
    status: "info",
    details: {
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === "production",
      platform: process.platform,
      note: "In production, static files are served directly by Vercel CDN",
    },
  });

  const statusCode = results.status === "error" ? 500 : 200;
  return NextResponse.json(results, { status: statusCode });
}
