#!/usr/bin/env tsx

/**
 * Automated Vercel-Supabase Fix Script
 *
 * This script automates the process of fixing the Supabase project mismatch
 * between your local environment and Vercel deployment.
 *
 * Prerequisites:
 * - Install Vercel CLI: npm i -g vercel
 * - Login to Vercel: vercel login
 *
 * Usage:
 * - tsx scripts/fix-vercel-supabase.ts
 * - npm run vercel:fix
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";

interface VercelEnvVar {
  key: string;
  value: string;
  target: string[];
  type?: "encrypted" | "plain";
}

// Environment variables configuration
const NEW_SUPABASE_VARS: VercelEnvVar[] = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    value: "https://kbdkfukqryxkgfnqttiy.supabase.co",
    target: ["production", "preview", "development"],
    type: "plain",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    value:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZGtmdWtxcnl4a2dmbnF0dGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjkzODQsImV4cCI6MjA2ODYwNTM4NH0.Us4DYgZRuiSvK99XnBx0i5hEkemIAFY9t_hlDiMMmBc",
    target: ["production", "preview", "development"],
    type: "encrypted",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    value:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZGtmdWtxcnl4a2dmbnF0dGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzAyOTM4NCwiZXhwIjoyMDY4NjA1Mzg0fQ.k6OwSGxmNcoBKwZzVosqDoHujTDmeSXwCQLrzOWKipA",
    target: ["production", "preview", "development"],
    type: "encrypted",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_BUCKET",
    value: "adventure-photos",
    target: ["production", "preview", "development"],
    type: "plain",
  },
];

// Variables to remove (old Supabase DB vars)
const VARS_TO_REMOVE = [
  "POSTGRES_URL",
  "POSTGRES_USER",
  "POSTGRES_HOST",
  "POSTGRES_PASSWORD",
  "POSTGRES_DATABASE",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_JWT_SECRET",
];

class VercelSupabaseFixer {
  private projectName?: string;
  private backupFile: string;

  constructor() {
    this.backupFile = join(process.cwd(), ".vercel-env-backup.json");
  }

  private executeCommand(command: string, description: string): string {
    try {
      console.log(`🔄 ${description}...`);
      const result = execSync(command, { encoding: "utf8", stdio: "pipe" });
      console.log(`✅ ${description} completed`);
      return result.trim();
    } catch (error: any) {
      console.error(`❌ ${description} failed:`);
      console.error(error.message);
      throw error;
    }
  }

  private async checkVercelCLI() {
    try {
      this.executeCommand("vercel --version", "Checking Vercel CLI");
    } catch (error) {
      console.error("❌ Vercel CLI not found. Please install it:");
      console.error("   npm install -g vercel");
      process.exit(1);
    }
  }

  private async checkVercelAuth() {
    try {
      const result = this.executeCommand(
        "vercel whoami",
        "Checking Vercel authentication"
      );
      console.log(`✅ Logged in as: ${result}`);
    } catch (error) {
      console.error("❌ Not logged into Vercel. Please login:");
      console.error("   vercel login");
      process.exit(1);
    }
  }

  private async getProjectInfo() {
    try {
      const result = this.executeCommand(
        "vercel project ls",
        "Getting project list"
      );
      console.log("📋 Available projects:");
      console.log(result);

      // Try to detect project name from vercel.json or current directory
      this.projectName = process.cwd().split(/[\\/]/).pop();
      console.log(`🎯 Using project: ${this.projectName}`);
    } catch (error) {
      console.error(
        "⚠️ Could not get project info, will use current directory context"
      );
    }
  }

  private async backupCurrentEnv() {
    try {
      console.log("💾 Backing up current environment variables...");

      const result = this.executeCommand(
        "vercel env ls --json",
        "Fetching current environment variables"
      );

      writeFileSync(this.backupFile, result);
      console.log(`✅ Backup saved to: ${this.backupFile}`);
    } catch (error) {
      console.error("⚠️ Could not backup environment variables");
      console.error("Continuing without backup...");
    }
  }

  private async removeOldVariables() {
    console.log("\n🧹 Removing old Supabase database variables...");

    for (const varName of VARS_TO_REMOVE) {
      try {
        // Remove from all environments
        for (const env of ["production", "preview", "development"]) {
          const command = `vercel env rm ${varName} ${env} --yes`;
          this.executeCommand(command, `Removing ${varName} from ${env}`);
        }
        console.log(`✅ Removed ${varName} from all environments`);
      } catch (error) {
        console.log(`⚠️ ${varName} not found or already removed`);
      }
    }
  }

  private async addNewVariables() {
    console.log("\n➕ Adding new Supabase storage variables...");

    for (const envVar of NEW_SUPABASE_VARS) {
      console.log(`\n🔧 Setting up ${envVar.key}...`);

      for (const target of envVar.target) {
        try {
          // Remove existing variable first (if exists)
          try {
            this.executeCommand(
              `vercel env rm ${envVar.key} ${target} --yes`,
              `Removing existing ${envVar.key} from ${target}`
            );
          } catch (error) {
            // Variable doesn't exist, that's fine
          }

          // Add new variable
          const command = `echo "${envVar.value}" | vercel env add ${envVar.key} ${target}`;
          this.executeCommand(command, `Adding ${envVar.key} to ${target}`);

          console.log(`   ✅ ${target}: ${envVar.key} set`);
        } catch (error) {
          console.error(`   ❌ Failed to set ${envVar.key} in ${target}`);
        }
      }
    }
  }

  private async verifyChanges() {
    console.log("\n🔍 Verifying environment variables...");

    try {
      const result = this.executeCommand(
        "vercel env ls",
        "Listing current environment variables"
      );

      console.log("\n📋 Current environment variables:");
      console.log(result);

      // Check if our new variables are present
      const requiredVars = NEW_SUPABASE_VARS.map((v) => v.key);
      let allPresent = true;

      for (const varName of requiredVars) {
        if (result.includes(varName)) {
          console.log(`✅ ${varName}: Found`);
        } else {
          console.log(`❌ ${varName}: Missing`);
          allPresent = false;
        }
      }

      return allPresent;
    } catch (error) {
      console.error("❌ Could not verify environment variables");
      return false;
    }
  }

  private generateDeploymentCommands() {
    console.log("\n🚀 Next steps for deployment:");
    console.log("=".repeat(50));
    console.log("1. Deploy your application:");
    console.log("   vercel --prod");
    console.log("");
    console.log("2. Test the storage connection:");
    console.log("   curl https://your-app.vercel.app/api/debug/storage-test");
    console.log("");
    console.log("3. Run local verification:");
    console.log("   npm run storage:verify");
    console.log("");
    console.log("4. Compare projects to confirm fix:");
    console.log("   npm run storage:compare");
  }

  private generateRollbackInstructions() {
    console.log("\n🔄 Rollback instructions:");
    console.log("=".repeat(30));
    console.log("If something goes wrong, you can rollback:");
    console.log("1. Run: tsx scripts/rollback-vercel-env.ts");
    console.log(`2. Or restore from backup: ${this.backupFile}`);
  }

  async runFix() {
    console.log("🚀 Starting Automated Vercel-Supabase Fix");
    console.log("=".repeat(50));
    console.log("This will update your Vercel environment variables to use");
    console.log(
      "your working local Supabase project instead of the wrong one."
    );
    console.log("");

    try {
      // Pre-flight checks
      await this.checkVercelCLI();
      await this.checkVercelAuth();
      await this.getProjectInfo();

      // Backup current state
      await this.backupCurrentEnv();

      console.log(
        "\n⚠️  WARNING: This will modify your Vercel environment variables!"
      );
      console.log(
        "Continue? Press Ctrl+C to cancel, or press Enter to continue..."
      );

      // Wait for user confirmation
      await new Promise<void>((resolve) => {
        process.stdin.once("data", () => resolve());
      });

      // Make the changes
      await this.removeOldVariables();
      await this.addNewVariables();

      // Verify changes
      const success = await this.verifyChanges();

      if (success) {
        console.log("\n🎉 Environment variables updated successfully!");
        this.generateDeploymentCommands();
      } else {
        console.log("\n⚠️ Some variables may not have been set correctly.");
        console.log("Please check the Vercel dashboard manually.");
      }

      this.generateRollbackInstructions();
    } catch (error) {
      console.error("\n💥 Fix process failed:", error);
      console.error("Check the backup file and try manual setup.");
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const fixer = new VercelSupabaseFixer();
  await fixer.runFix();
}

if (require.main === module) {
  main().catch(console.error);
}

export { VercelSupabaseFixer };
