#!/usr/bin/env tsx

/**
 * Compare Supabase Projects Script
 *
 * This script compares your local and Vercel Supabase projects
 * to show exactly what's different.
 */

import { createClient } from "@supabase/supabase-js";

// Local Supabase (working)
const LOCAL_CONFIG = {
  url: "https://kbdkfukqryxkgfnqttiy.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZGtmdWtxcnl4a2dmbnF0dGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjkzODQsImV4cCI6MjA2ODYwNTM4NH0.Us4DYgZRuiSvK99XnBx0i5hEkemIAFY9t_hlDiMMmBc",
  serviceKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZGtmdWtxcnl4a2dmbnF0dGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAyOTM4NCwiZXhwIjoyMDY4NjA1Mzg0fQ.k6OwSGxmNcoBKwZzVosqDoHujTDmeSXwCQLrzOWKipA",
};

// Vercel Supabase (different project)
const VERCEL_CONFIG = {
  url: "https://izjbtlpcpxlnndofudti.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6amJ0bHBjcHhsbm5kb2Z1ZHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTE0NjMsImV4cCI6MjA2ODI2NzQ2M30.hCJkEvz271RnyQcBULTFIZSD54c-qQas2dYQjWX3LwQ",
  serviceKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6amJ0bHBjcHhsbm5kb2Z1ZHRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY5MTQ2MywiZXhwIjoyMDY4MjY3NDYzfQ.NeC40E1TIMw4aQ0eAZLa8ocO1Kk_g-fDGJ0wb540AgE",
};

async function compareProject(name: string, config: typeof LOCAL_CONFIG) {
  console.log(`\n📊 ${name} Project Analysis`);
  console.log("=".repeat(40));
  console.log(`URL: ${config.url}`);

  try {
    const adminClient = createClient(config.url, config.serviceKey);

    // Check storage buckets
    const { data: buckets, error: bucketsError } =
      await adminClient.storage.listBuckets();

    if (bucketsError) {
      console.log("❌ Storage Error:", bucketsError.message);
      return;
    }

    console.log(`✅ Storage Connection: Working`);
    console.log(`📦 Total Buckets: ${buckets.length}`);

    buckets.forEach((bucket) => {
      console.log(
        `   - ${bucket.name} (${bucket.public ? "public" : "private"})`
      );
    });

    // Check for adventure-photos bucket specifically
    const adventureBucket = buckets.find((b) => b.name === "adventure-photos");
    if (adventureBucket) {
      console.log(`✅ adventure-photos: Found!`);
      console.log(`   - Public: ${adventureBucket.public}`);
      console.log(
        `   - File Size Limit: ${adventureBucket.file_size_limit ? `${Math.round(adventureBucket.file_size_limit / 1024 / 1024)}MB` : "unlimited"}`
      );
      console.log(
        `   - Created: ${new Date(adventureBucket.created_at).toLocaleDateString()}`
      );

      // Try to list files in the bucket
      const { data: files, error: filesError } = await adminClient.storage
        .from("adventure-photos")
        .list("", { limit: 10 });

      if (filesError) {
        console.log(`⚠️  File List Error: ${filesError.message}`);
      } else {
        console.log(`📁 Files in bucket: ${files.length}`);
        if (files.length > 0) {
          files.slice(0, 3).forEach((file) => {
            console.log(`   - ${file.name}`);
          });
          if (files.length > 3) {
            console.log(`   ... and ${files.length - 3} more`);
          }
        }
      }
    } else {
      console.log(`❌ adventure-photos: NOT FOUND!`);
    }
  } catch (error) {
    console.log(
      "❌ Connection Failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

async function main() {
  console.log("🔍 Supabase Projects Comparison");
  console.log("This shows why photo uploads fail in production\n");

  await compareProject("LOCAL (Working)", LOCAL_CONFIG);
  await compareProject("VERCEL (Current)", VERCEL_CONFIG);

  console.log("\n" + "=".repeat(60));
  console.log("📋 SUMMARY");
  console.log("=".repeat(60));
  console.log(
    "🏠 Local:  Uses kbdkfukqryxkgfnqttiy project (✅ has adventure-photos)"
  );
  console.log(
    "☁️  Vercel: Uses izjbtlpcpxlnndofudti project (❌ missing adventure-photos)"
  );
  console.log("");
  console.log("🛠️  SOLUTION: Update Vercel env vars to use LOCAL project");
  console.log("📖 See: VERCEL-FIX-SUPABASE-MISMATCH.md for exact steps");
}

if (require.main === module) {
  main().catch(console.error);
}
