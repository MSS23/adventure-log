#!/usr/bin/env tsx

/**
 * Vercel Environment Variables Rollback Script
 *
 * This script restores your Vercel environment variables from backup
 * in case the fix process went wrong.
 *
 * Usage:
 * - tsx scripts/rollback-vercel-env.ts
 * - npm run vercel:rollback
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface VercelEnvBackup {
  name: string;
  value: string;
  target: string;
  type: "plain" | "encrypted";
  configurationId?: string;
  updatedAt: number;
  createdAt: number;
}

class VercelEnvRollback {
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

  private loadBackup(): VercelEnvBackup[] {
    if (!existsSync(this.backupFile)) {
      console.error("❌ Backup file not found:", this.backupFile);
      console.error("Cannot rollback without backup.");
      process.exit(1);
    }

    try {
      const backupData = readFileSync(this.backupFile, "utf8");
      const envVars = JSON.parse(backupData);

      console.log(
        `📋 Found backup with ${envVars.length} environment variables`
      );
      return envVars;
    } catch (error) {
      console.error("❌ Could not read backup file:", error);
      process.exit(1);
    }
  }

  private async restoreVariables(envVars: VercelEnvBackup[]) {
    console.log("\n🔄 Restoring environment variables from backup...");

    // Group variables by name to handle multiple targets
    const varGroups: { [key: string]: VercelEnvBackup[] } = {};

    envVars.forEach((envVar) => {
      if (!varGroups[envVar.name]) {
        varGroups[envVar.name] = [];
      }
      varGroups[envVar.name].push(envVar);
    });

    for (const [varName, vars] of Object.entries(varGroups)) {
      console.log(`\n🔧 Restoring ${varName}...`);

      for (const envVar of vars) {
        try {
          // Remove current variable first
          try {
            this.executeCommand(
              `vercel env rm ${varName} ${envVar.target} --yes`,
              `Removing current ${varName} from ${envVar.target}`
            );
          } catch (error) {
            // Variable doesn't exist, that's fine
          }

          // Restore from backup
          const command = `echo "${envVar.value}" | vercel env add ${varName} ${envVar.target}`;
          this.executeCommand(
            command,
            `Restoring ${varName} to ${envVar.target}`
          );

          console.log(`   ✅ ${envVar.target}: ${varName} restored`);
        } catch (error) {
          console.error(
            `   ❌ Failed to restore ${varName} in ${envVar.target}`
          );
        }
      }
    }
  }

  private async verifyRollback() {
    console.log("\n🔍 Verifying rollback...");

    try {
      const result = this.executeCommand(
        "vercel env ls",
        "Listing current environment variables"
      );

      console.log("\n📋 Current environment variables after rollback:");
      console.log(result);
    } catch (error) {
      console.error("❌ Could not verify rollback");
    }
  }

  async performRollback() {
    console.log("🔄 Starting Vercel Environment Variables Rollback");
    console.log("=".repeat(50));
    console.log("This will restore your environment variables from backup.");
    console.log("");

    try {
      // Load backup
      const envVars = this.loadBackup();

      console.log(
        "\n⚠️  WARNING: This will overwrite current environment variables!"
      );
      console.log(
        "Continue? Press Ctrl+C to cancel, or press Enter to continue..."
      );

      // Wait for user confirmation
      await new Promise<void>((resolve) => {
        process.stdin.once("data", () => resolve());
      });

      // Restore variables
      await this.restoreVariables(envVars);

      // Verify
      await this.verifyRollback();

      console.log("\n🎉 Rollback completed!");
      console.log("Your environment variables have been restored from backup.");
      console.log("");
      console.log("Next steps:");
      console.log("1. Redeploy your application: vercel --prod");
      console.log("2. Test functionality to ensure everything works");
    } catch (error) {
      console.error("\n💥 Rollback failed:", error);
      console.error(
        "You may need to restore variables manually in Vercel dashboard."
      );
      process.exit(1);
    }
  }
}

// Alternative: Manual rollback to old Supabase project
async function manualRollbackToOldSupabase() {
  console.log("🔄 Manual Rollback to Old Supabase Project");
  console.log("=".repeat(45));
  console.log("This will restore the old Supabase project settings.");
  console.log("(Note: This will still have the photo upload issue)");
  console.log("");

  const oldSupabaseVars = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      value: "https://izjbtlpcpxlnndofudti.supabase.co",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      value:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6amJ0bHBjcHhsbm5kb2Z1ZHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTE0NjMsImV4cCI6MjA2ODI2NzQ2M30.hCJkEvz271RnyQcBULTFIZSD54c-qQas2dYQjWX3LwQ",
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      value:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6amJ0bHBjcHhsbm5kb2Z1ZHRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY5MTQ2MywiZXhwIjoyMDY4MjY3NDYzfQ.NeC40E1TIMw4aQ0eAZLa8ocO1Kk_g-fDGJ0wb540AgE",
    },
  ];

  for (const envVar of oldSupabaseVars) {
    console.log(`🔧 Setting ${envVar.key}...`);

    for (const target of ["production", "preview", "development"]) {
      try {
        const command = `echo "${envVar.value}" | vercel env add ${envVar.key} ${target}`;
        execSync(command, { stdio: "inherit" });
        console.log(`   ✅ ${target}: ${envVar.key} set`);
      } catch (error) {
        console.error(`   ❌ Failed to set ${envVar.key} in ${target}`);
      }
    }
  }

  console.log("\n⚠️ Old Supabase project restored.");
  console.log("Photo uploads will still fail until you fix the bucket issue.");
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--old-supabase")) {
    await manualRollbackToOldSupabase();
  } else {
    const _rollbacker = new VercelEnvRollback();
    await _rollbacker.performRollback();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { VercelEnvRollback };
