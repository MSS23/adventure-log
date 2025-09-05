#!/usr/bin/env tsx

/**
 * Supabase Storage Verification Script
 *
 * This script verifies and sets up the Supabase storage configuration
 * for both local development and production deployment.
 *
 * Usage:
 * - tsx scripts/verify-supabase-storage.ts
 * - npm run storage:verify
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// Configuration
const BUCKET_NAME = "adventure-photos";
const TEST_FOLDER = "test-uploads";

interface StorageConfig {
  url: string;
  anonKey: string;
  serviceKey: string;
  bucket: string;
}

interface VerificationResult {
  step: string;
  status: "success" | "error" | "warning";
  message: string;
  details?: any;
}

class SupabaseStorageVerifier {
  private config: StorageConfig;
  private adminClient: any;
  private results: VerificationResult[] = [];

  constructor(config: StorageConfig) {
    this.config = config;
    this.adminClient = createClient(config.url, config.serviceKey);
  }

  private addResult(
    step: string,
    status: "success" | "error" | "warning",
    message: string,
    details?: any
  ) {
    this.results.push({ step, status, message, details });

    const emoji =
      status === "success" ? "✅" : status === "error" ? "❌" : "⚠️";
    console.log(`${emoji} ${step}: ${message}`);

    if (details) {
      console.log("  Details:", details);
    }
  }

  async verifyConnection() {
    console.log("\n🔗 Testing Supabase Storage Connection...");

    try {
      // Test storage service connection by listing buckets
      const { data: buckets, error: bucketsError } =
        await this.adminClient.storage.listBuckets();

      if (bucketsError) {
        throw bucketsError;
      }

      this.addResult(
        "Storage Connection",
        "success",
        "Successfully connected to Supabase Storage",
        { availableBuckets: buckets?.length || 0 }
      );
    } catch (error) {
      this.addResult(
        "Storage Connection",
        "error",
        "Failed to connect to Supabase Storage",
        error
      );
      return false;
    }

    return true;
  }

  async verifyBucket() {
    console.log("\n📦 Verifying Storage Bucket...");

    try {
      // List all buckets
      const { data: buckets, error: bucketsError } =
        await this.adminClient.storage.listBuckets();

      if (bucketsError) {
        throw bucketsError;
      }

      const adventureBucket = buckets.find(
        (b: any) => b.name === this.config.bucket
      );

      if (!adventureBucket) {
        this.addResult(
          "Bucket Exists",
          "error",
          `Bucket "${this.config.bucket}" not found`,
          { availableBuckets: buckets.map((b: any) => b.name) }
        );
        return false;
      }

      this.addResult(
        "Bucket Exists",
        "success",
        `Found bucket "${this.config.bucket}"`,
        adventureBucket
      );

      return true;
    } catch (error) {
      this.addResult(
        "Bucket Verification",
        "error",
        "Failed to verify storage bucket",
        error
      );
      return false;
    }
  }

  async createBucketIfMissing() {
    console.log("\n🏗️ Creating Storage Bucket...");

    try {
      const { data, error } = await this.adminClient.storage.createBucket(
        this.config.bucket,
        {
          public: true,
          allowedMimeTypes: [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif",
          ],
          fileSizeLimit: 25 * 1024 * 1024, // 25MB
        }
      );

      if (error && !error.message.includes("already exists")) {
        throw error;
      }

      this.addResult(
        "Create Bucket",
        error ? "warning" : "success",
        error
          ? `Bucket already exists: ${error.message}`
          : "Bucket created successfully",
        data
      );

      return true;
    } catch (error) {
      this.addResult(
        "Create Bucket",
        "error",
        "Failed to create storage bucket",
        error
      );
      return false;
    }
  }

  async testUpload() {
    console.log("\n📤 Testing File Upload...");

    try {
      // Create a test file
      const testContent = `Adventure Log Storage Test - ${new Date().toISOString()}`;
      const testFileName = `${TEST_FOLDER}/test-${Date.now()}.txt`;
      const testBuffer = Buffer.from(testContent);

      // Upload test file
      const { data: uploadData, error: uploadError } =
        await this.adminClient.storage
          .from(this.config.bucket)
          .upload(testFileName, testBuffer, {
            contentType: "text/plain",
            upsert: false,
          });

      if (uploadError) {
        throw uploadError;
      }

      this.addResult(
        "File Upload",
        "success",
        "Test file uploaded successfully",
        { path: uploadData.path }
      );

      // Get public URL
      const { data: urlData } = this.adminClient.storage
        .from(this.config.bucket)
        .getPublicUrl(testFileName);

      this.addResult("Public URL", "success", "Generated public URL", {
        url: urlData.publicUrl,
      });

      // Clean up test file
      await this.adminClient.storage
        .from(this.config.bucket)
        .remove([testFileName]);

      this.addResult("Cleanup", "success", "Test file cleaned up");

      return true;
    } catch (error) {
      this.addResult(
        "File Upload Test",
        "error",
        "Failed to upload test file",
        error
      );
      return false;
    }
  }

  async verifyBucketPolicies() {
    console.log("\n🔒 Verifying Storage Policies...");

    try {
      // Note: Supabase storage policies are managed through the dashboard
      // This is a placeholder for policy verification
      this.addResult(
        "Storage Policies",
        "warning",
        "Storage policies should be configured in Supabase dashboard",
        {
          required: [
            "Allow public read access to photos",
            "Allow authenticated users to upload photos",
            "Allow users to delete their own photos",
          ],
          note: "Configure these manually in Supabase Dashboard > Storage > Policies",
        }
      );

      return true;
    } catch (error) {
      this.addResult(
        "Policy Verification",
        "error",
        "Failed to verify storage policies",
        error
      );
      return false;
    }
  }

  async generateReport() {
    console.log("\n📊 Verification Report");
    console.log("=".repeat(50));

    const successCount = this.results.filter(
      (r) => r.status === "success"
    ).length;
    const errorCount = this.results.filter((r) => r.status === "error").length;
    const warningCount = this.results.filter(
      (r) => r.status === "warning"
    ).length;

    console.log(`✅ Successful checks: ${successCount}`);
    console.log(`❌ Failed checks: ${errorCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);

    if (errorCount === 0) {
      console.log("\n🎉 All verification checks passed!");
      console.log("Your Supabase storage is properly configured.");
    } else {
      console.log("\n🚨 Some checks failed. Please address the issues above.");
    }

    return {
      success: errorCount === 0,
      results: this.results,
      summary: { successCount, errorCount, warningCount },
    };
  }

  async runFullVerification() {
    console.log("🚀 Starting Supabase Storage Verification");
    console.log("Configuration:", {
      url: this.config.url,
      bucket: this.config.bucket,
      anonKey: this.config.anonKey.substring(0, 20) + "...",
      serviceKey: this.config.serviceKey.substring(0, 20) + "...",
    });

    const connectionOk = await this.verifyConnection();
    if (!connectionOk) {
      await this.generateReport();
      return false;
    }

    const bucketExists = await this.verifyBucket();
    if (!bucketExists) {
      await this.createBucketIfMissing();
    }

    await this.testUpload();
    await this.verifyBucketPolicies();

    const report = await this.generateReport();
    return report.success;
  }
}

// Environment configuration
function getStorageConfig(): StorageConfig {
  // Try to load from .env.local
  const envPath = join(process.cwd(), ".env.local");

  try {
    const envContent = readFileSync(envPath, "utf-8");
    const envVars: { [key: string]: string } = {};

    envContent.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join("=").replace(/"/g, "").trim();
      }
    });

    return {
      url:
        envVars.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        "",
      anonKey:
        envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        "",
      serviceKey:
        envVars.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        "",
      bucket:
        envVars.NEXT_PUBLIC_SUPABASE_BUCKET ||
        process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
        BUCKET_NAME,
    };
  } catch (error) {
    // Fallback to process.env
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      bucket: process.env.NEXT_PUBLIC_SUPABASE_BUCKET || BUCKET_NAME,
    };
  }
}

// Main execution
async function main() {
  try {
    const config = getStorageConfig();

    if (!config.url || !config.anonKey || !config.serviceKey) {
      console.error("❌ Missing required environment variables:");
      if (!config.url) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
      if (!config.anonKey) console.error("  - NEXT_PUBLIC_SUPABASE_ANON_KEY");
      if (!config.serviceKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
      process.exit(1);
    }

    const verifier = new SupabaseStorageVerifier(config);
    const success = await verifier.runFullVerification();

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("💥 Verification script failed:", error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

export { SupabaseStorageVerifier, getStorageConfig };
