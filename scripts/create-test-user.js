/**
 * Test User Creation Script for Adventure Log
 *
 * This script creates a test user account using Supabase authentication.
 * Use this for testing purposes during development.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Test user credentials
 */
const TEST_USER = {
  email: "test@adventurelog.com",
  password: "TestPass123!",
  name: "Test User",
  metadata: {
    full_name: "Test User",
    name: "Test User",
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  },
};

/**
 * Create a test user account
 */
async function createTestUser() {
  console.log("🚀 Creating test user for Adventure Log...");
  console.log(`📧 Email: ${TEST_USER.email}`);
  console.log(`🔑 Password: ${TEST_USER.password}`);
  console.log();

  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("❌ Error checking existing users:", listError.message);
      return;
    }

    const existingUser = existingUsers.users.find(
      (user) => user.email === TEST_USER.email
    );

    if (existingUser) {
      console.log("ℹ️  Test user already exists!");
      console.log(`👤 User ID: ${existingUser.id}`);
      console.log(`📧 Email: ${existingUser.email}`);
      console.log(
        `✅ Email Confirmed: ${existingUser.email_confirmed_at ? "Yes" : "No"}`
      );
      console.log(
        `📅 Created: ${new Date(existingUser.created_at).toLocaleString()}`
      );
      console.log();
      console.log("🧪 You can use these credentials to test your app:");
      console.log(`📧 Email: ${TEST_USER.email}`);
      console.log(`🔑 Password: ${TEST_USER.password}`);
      return;
    }

    // Create new test user with admin API
    console.log("👤 Creating new test user...");
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true, // Auto-confirm email for testing
      user_metadata: TEST_USER.metadata,
    });

    if (error) {
      console.error("❌ Error creating test user:", error.message);
      return;
    }

    if (data.user) {
      console.log("✅ Test user created successfully!");
      console.log(`👤 User ID: ${data.user.id}`);
      console.log(`📧 Email: ${data.user.email}`);
      console.log(`✅ Email Confirmed: Yes (auto-confirmed for testing)`);
      console.log(
        `📅 Created: ${new Date(data.user.created_at).toLocaleString()}`
      );
      console.log();
      console.log("🧪 Use these credentials to test your app:");
      console.log(`📧 Email: ${TEST_USER.email}`);
      console.log(`🔑 Password: ${TEST_USER.password}`);
      console.log();
      console.log("🎯 Next steps:");
      console.log("1. Start your development server: npm run dev");
      console.log("2. Navigate to: http://localhost:3000/auth/signin");
      console.log("3. Sign in using the credentials above");
      console.log("4. Test creating albums, uploading photos, etc.");
    } else {
      console.log("⚠️  User creation completed but no user data returned");
    }
  } catch (error) {
    console.error("💥 Unexpected error:", error.message);
  }
}

/**
 * Delete the test user (cleanup function)
 */
async function deleteTestUser() {
  console.log("🧹 Deleting test user...");

  try {
    // Find the test user
    const { data: existingUsers, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("❌ Error checking existing users:", listError.message);
      return;
    }

    const existingUser = existingUsers.users.find(
      (user) => user.email === TEST_USER.email
    );

    if (!existingUser) {
      console.log("ℹ️  Test user does not exist, nothing to delete.");
      return;
    }

    // Delete the user
    const { error } = await supabase.auth.admin.deleteUser(existingUser.id);

    if (error) {
      console.error("❌ Error deleting test user:", error.message);
      return;
    }

    console.log("✅ Test user deleted successfully!");
    console.log(`👤 Deleted User ID: ${existingUser.id}`);
    console.log(`📧 Deleted Email: ${existingUser.email}`);
  } catch (error) {
    console.error("💥 Unexpected error:", error.message);
  }
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];

  switch (command) {
    case "create":
      await createTestUser();
      break;
    case "delete":
      await deleteTestUser();
      break;
    case "recreate":
      await deleteTestUser();
      console.log();
      await createTestUser();
      break;
    default:
      console.log("Adventure Log - Test User Management");
      console.log();
      console.log("Usage:");
      console.log(
        "  node scripts/create-test-user.js create    # Create test user"
      );
      console.log(
        "  node scripts/create-test-user.js delete    # Delete test user"
      );
      console.log(
        "  node scripts/create-test-user.js recreate  # Delete and recreate test user"
      );
      console.log();
      console.log("Test Credentials:");
      console.log(`  📧 Email: ${TEST_USER.email}`);
      console.log(`  🔑 Password: ${TEST_USER.password}`);
      break;
  }
}

// Run the script
main().catch(console.error);
