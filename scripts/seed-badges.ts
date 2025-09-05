import { initializeDefaultBadges } from "../lib/badges";

async function main() {
  console.log("🏆 Initializing default badges...");
  await initializeDefaultBadges();
  console.log("✅ Badge initialization complete!");
}

main()
  .catch((error) => {
    console.error("Error initializing badges:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
