#!/usr/bin/env tsx

/**
 * Supabase Storage Setup Script
 *
 * This script sets up the Supabase storage configuration
 * for Adventure Log photo uploads.
 *
 * Usage:
 * - tsx scripts/setup-supabase-storage.ts
 * - npm run storage:setup
 */

import { createClient } from "@supabase/supabase-js";
import { getStorageConfig } from "./verify-supabase-storage";

const BUCKET_NAME = "adventure-photos";

interface StoragePolicy {
  name: string;
  definition: string;
  check?: string;
}

class SupabaseStorageSetup {
  private adminClient: any;
  private config: any;

  constructor(config: any) {
    this.config = config;
    this.adminClient = createClient(config.url, config.serviceKey);
  }

  async createBucket() {
    console.log("\n🏗️ Creating Storage Bucket...");

    try {
      const { data, error } = await this.adminClient.storage.createBucket(
        BUCKET_NAME,
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

      if (error?.message.includes("already exists")) {
        console.log("✅ Bucket already exists");
      } else {
        console.log("✅ Bucket created successfully");
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to create bucket:", error);
      return false;
    }
  }

  async configureBucket() {
    console.log("\n⚙️ Configuring Bucket Settings...");

    try {
      // Update bucket settings
      const { data, error } = await this.adminClient.storage.updateBucket(
        BUCKET_NAME,
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

      if (error) {
        console.log(
          "⚠️ Could not update bucket settings (may need manual configuration):",
          error.message
        );
      } else {
        console.log("✅ Bucket settings updated successfully");
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to configure bucket:", error);
      return false;
    }
  }

  async testFolderStructure() {
    console.log("\n📁 Setting up folder structure...");

    try {
      // Create test folders to establish the structure
      const folders = ["albums", "test-uploads"];

      for (const folder of folders) {
        const testFile = `${folder}/.keep`;
        const { data, error } = await this.adminClient.storage
          .from(BUCKET_NAME)
          .upload(testFile, "folder placeholder", {
            contentType: "text/plain",
            upsert: true,
          });

        if (error && !error.message.includes("already exists")) {
          console.log(`⚠️ Could not create ${folder} folder:`, error.message);
        } else {
          console.log(`✅ ${folder}/ folder structure ready`);
        }
      }

      return true;
    } catch (error) {
      console.error("❌ Failed to setup folder structure:", error);
      return false;
    }
  }

  printPolicyInstructions() {
    console.log("\n🔒 Storage Policy Setup Instructions");
    console.log("=".repeat(50));
    console.log(
      "Please manually configure these policies in Supabase Dashboard:"
    );
    console.log("Dashboard → Storage → Policies → Create Policy");
    console.log();

    const policies = [
      {
        name: "1. Allow public read access to photos",
        table: "objects",
        operation: "SELECT",
        policy: `bucket_id = '${BUCKET_NAME}'`,
        description: "Allows anyone to view uploaded photos",
      },
      {
        name: "2. Allow authenticated users to upload photos",
        table: "objects",
        operation: "INSERT",
        policy: `bucket_id = '${BUCKET_NAME}' AND auth.role() = 'authenticated'`,
        description: "Allows logged-in users to upload photos",
      },
      {
        name: "3. Allow users to update their own photos",
        table: "objects",
        operation: "UPDATE",
        policy: `bucket_id = '${BUCKET_NAME}' AND auth.role() = 'authenticated'`,
        description: "Allows users to update photo metadata",
      },
      {
        name: "4. Allow users to delete their own photos",
        table: "objects",
        operation: "DELETE",
        policy: `bucket_id = '${BUCKET_NAME}' AND auth.role() = 'authenticated'`,
        description: "Allows users to delete their photos (optional)",
      },
    ];

    policies.forEach((policy, index) => {
      console.log(`${policy.name}:`);
      console.log(`   Table: ${policy.table}`);
      console.log(`   Operation: ${policy.operation}`);
      console.log(`   Policy: ${policy.policy}`);
      console.log(`   Description: ${policy.description}`);
      console.log();
    });

    console.log("📝 Manual Steps:");
    console.log(
      "1. Go to: https://supabase.com/dashboard/project/kbdkfukqryxkgfnqttiy/storage/policies"
    );
    console.log('2. Click "Create Policy" for each policy above');
    console.log("3. Use the provided policy expressions");
    console.log("4. Test by running: npm run storage:verify");
    console.log();
  }

  async generateEnvironmentTemplate() {
    console.log("\n📋 Environment Variables Template");
    console.log("=".repeat(50));
    console.log("Copy these to your Vercel environment variables:");
    console.log();

    console.log(
      "NEXT_PUBLIC_SUPABASE_URL=https://kbdkfukqryxkgfnqttiy.supabase.co"
    );
    console.log(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    );
    console.log(
      "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    );
    console.log("NEXT_PUBLIC_SUPABASE_BUCKET=adventure-photos");
    console.log();

    console.log("📝 Vercel Setup Steps:");
    console.log(
      "1. Go to: https://vercel.com/your-username/your-project/settings/environment-variables"
    );
    console.log("2. Add each environment variable above");
    console.log(
      '3. Set them for "Production", "Preview", and "Development" environments'
    );
    console.log("4. Redeploy your application");
    console.log();

    // Also save to a file
    const envTemplate = `# Supabase Configuration for Adventure Log
# Copy these to your Vercel environment variables

NEXT_PUBLIC_SUPABASE_URL=${this.config.url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${this.config.anonKey}
SUPABASE_SERVICE_ROLE_KEY=${this.config.serviceKey}
NEXT_PUBLIC_SUPABASE_BUCKET=${this.config.bucket}

# Other required variables (keep your existing values)
DATABASE_URL="your-neon-database-url"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-vercel-domain.vercel.app"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
`;

    require("fs").writeFileSync(".env.vercel.template", envTemplate);
    console.log("💾 Template saved to: .env.vercel.template");
  }

  async runSetup() {
    console.log("🚀 Setting up Supabase Storage for Adventure Log");
    console.log("Configuration:", {
      url: this.config.url,
      bucket: this.config.bucket,
    });

    const bucketCreated = await this.createBucket();
    if (!bucketCreated) {
      console.error("❌ Setup failed: Could not create bucket");
      return false;
    }

    await this.configureBucket();
    await this.testFolderStructure();

    this.printPolicyInstructions();
    await this.generateEnvironmentTemplate();

    console.log("\n🎉 Supabase Storage Setup Complete!");
    console.log("📝 Next steps:");
    console.log(
      "1. Configure the storage policies manually (see instructions above)"
    );
    console.log("2. Update your Vercel environment variables");
    console.log("3. Run: npm run storage:verify");
    console.log("4. Deploy and test photo uploads");

    return true;
  }
}

// Main execution
async function main() {
  try {
    const config = getStorageConfig();

    if (!config.url || !config.serviceKey) {
      console.error("❌ Missing required environment variables:");
      if (!config.url) console.error("  - NEXT_PUBLIC_SUPABASE_URL");
      if (!config.serviceKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY");
      process.exit(1);
    }

    const setup = new SupabaseStorageSetup(config);
    const success = await setup.runSetup();

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("💥 Setup script failed:", error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}
