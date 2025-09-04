<<<<<<< HEAD
import { initializeDefaultBadges } from '../lib/badges';

async function main() {
  console.log('🏆 Initializing default badges...');
  await initializeDefaultBadges();
  console.log('✅ Badge initialization complete!');
=======
import { initializeDefaultBadges } from "../lib/badges";

async function main() {
  console.log("🏆 Initializing default badges...");
  await initializeDefaultBadges();
  console.log("✅ Badge initialization complete!");
>>>>>>> oauth-upload-fixes
}

main()
  .catch((error) => {
<<<<<<< HEAD
    console.error('Error initializing badges:', error);
=======
    console.error("Error initializing badges:", error);
>>>>>>> oauth-upload-fixes
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
<<<<<<< HEAD
  });
=======
  });
>>>>>>> oauth-upload-fixes
