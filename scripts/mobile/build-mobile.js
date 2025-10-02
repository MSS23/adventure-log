const fs = require('fs');
const path = require('path');

// Function to copy directory recursively with exclusions
function copyDir(src, dest, excludePatterns = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip excluded patterns
    const shouldExclude = excludePatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return entry.name.includes(pattern);
      } else if (pattern instanceof RegExp) {
        return pattern.test(entry.name);
      }
      return false;
    });

    if (shouldExclude) {
      console.log(`⏭️  Skipping excluded file: ${entry.name}`);
      continue;
    }

    if (entry.isDirectory()) {
      // Skip problematic directories
      if (['cache', 'types'].includes(entry.name)) {
        console.log(`⏭️  Skipping excluded directory: ${entry.name}`);
        continue;
      }
      copyDir(srcPath, destPath, excludePatterns);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Function to clean up problematic files from dist directory
function cleanupProblematicFiles() {
  const distDir = 'dist';
  const problematicPaths = [
    path.join(distDir, 'cache'),
    path.join(distDir, 'types'),
    path.join(distDir, '_next', 'cache')
  ];

  for (const problematicPath of problematicPaths) {
    if (fs.existsSync(problematicPath)) {
      fs.rmSync(problematicPath, { recursive: true, force: true });
      console.log(`🧹 Cleaned up: ${problematicPath}`);
    }
  }

  // Remove large pack files if they exist
  const packFiles = [
    path.join(distDir, '**', '*.pack')
  ];

  // Also clean up any generated .map files that are too large
  const globPattern = path.join(distDir, '**', '*.map');
  try {
    const { execSync } = require('child_process');
    // Remove map files larger than 1MB using find command
    execSync(`find "${distDir}" -name "*.map" -size +1M -delete 2>/dev/null || true`, { stdio: 'pipe' });
    console.log('🧹 Cleaned up large map files');
  } catch (error) {
    // Silently continue if find command fails (Windows compatibility)
  }
}

// Function to create a basic index.html for Capacitor
function createIndexHTML() {
  const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Adventure Log</title>
    <meta name="format-detection" content="telephone=no">
    <meta name="msapplication-tap-highlight" content="no">
    <style>
        * {
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -webkit-font-smoothing: antialiased;
        }
        body {
            margin: 0;
            padding: env(safe-area-inset-top, 20px) env(safe-area-inset-right, 20px) env(safe-area-inset-bottom, 20px) env(safe-area-inset-left, 20px);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            overflow: hidden;
        }
        .container {
            max-width: 400px;
            padding: 20px;
        }
        h1 {
            font-size: 2.5em;
            margin-bottom: 0.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            font-weight: 300;
        }
        .loading {
            margin: 2em 0;
            font-size: 1.2em;
        }
        .spinner {
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 3px solid white;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1em;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .platform-info {
            margin-top: 2em;
            font-size: 0.9em;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌍 Adventure Log</h1>
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading your adventure...</p>
            <div class="platform-info">
                <p>Native App Version</p>
            </div>
        </div>
        <script>
            // For Capacitor mobile apps, redirect to the main app
            // Add small delay to show loading screen
            setTimeout(() => {
                try {
                    // Try to redirect to the Next.js app
                    window.location.href = './server/app/index.html';
                } catch (error) {
                    console.error('Failed to redirect:', error);
                    // Fallback: reload the page
                    window.location.reload();
                }
            }, 1500);

            // Handle back button on Android
            document.addEventListener('deviceready', function() {
                document.addEventListener('backbutton', function(e) {
                    e.preventDefault();
                    // Handle back button gracefully
                }, false);
            }, false);
        </script>
    </div>
</body>
</html>`;

  return indexHTML;
}

// Function to optimize assets for mobile
function optimizeForMobile() {
  const distDir = 'dist';

  // Create a capacitor.json file for better native integration
  const capacitorJson = {
    appName: 'Adventure Log',
    webDir: 'dist',
    server: {
      androidScheme: 'https',
      iosScheme: 'https'
    }
  };

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Write capacitor.json to dist directory
  fs.writeFileSync(
    path.join(distDir, 'capacitor.json'),
    JSON.stringify(capacitorJson, null, 2)
  );

  console.log('⚙️  Created mobile-optimized configurations');
}

// Main build process
async function buildMobile() {
  try {
    console.log('🏗️  Building cross-platform mobile app...');
    console.log(`🎯 Target platforms: Android, iOS, Web`);

    // Set environment for mobile build
    process.env.MOBILE_BUILD = 'true';
    process.env.NODE_ENV = 'production';
    const { execSync } = require('child_process');

    console.log('📦 Building Next.js app for mobile...');
    try {
      execSync('npx next build', {
        stdio: 'inherit',
        env: { ...process.env, MOBILE_BUILD: 'true' }
      });
    } catch (buildError) {
      console.error('❌ Next.js build failed:', buildError.message);
      throw buildError;
    }

    // Check if dist directory exists
    if (!fs.existsSync('dist')) {
      throw new Error('Build output directory "dist" not found after Next.js build');
    }

    console.log('📁 Preparing files for mobile platforms...');

    // Optimize for mobile platforms
    optimizeForMobile();

    // Create main index.html for Capacitor
    const indexHTML = createIndexHTML();
    fs.writeFileSync(path.join('dist', 'index.html'), indexHTML);
    console.log('📄 Created mobile-optimized index.html');

    // Copy HTML files from server/app to root for Capacitor
    const serverAppDir = path.join('dist', 'server', 'app');
    if (fs.existsSync(serverAppDir)) {
      const htmlFiles = fs.readdirSync(serverAppDir).filter(file => file.endsWith('.html'));

      for (const file of htmlFiles) {
        const srcPath = path.join(serverAppDir, file);
        const destPath = path.join('dist', file === 'index.html' ? 'app.html' : file);
        fs.copyFileSync(srcPath, destPath);
      }

      console.log(`📄 Copied ${htmlFiles.length} HTML files for mobile access`);
    }

    // Handle static assets with exclusions
    const staticDir = path.join('dist', 'static');
    if (fs.existsSync(staticDir)) {
      const nextStaticDir = path.join('dist', '_next', 'static');
      if (!fs.existsSync(path.dirname(nextStaticDir))) {
        fs.mkdirSync(path.dirname(nextStaticDir), { recursive: true });
      }

      // Copy with exclusions for large files
      const excludePatterns = [
        /\.pack$/,
        /\.map$/,
        'webpack',
        'chunks/pages'
      ];

      copyDir(staticDir, nextStaticDir, excludePatterns);
      console.log('🎨 Optimized static assets for mobile (excluding large files)');
    }

    // Clean up problematic files that could cause GitHub push issues
    console.log('🧹 Cleaning up problematic files...');
    cleanupProblematicFiles();

    // Create a manifest file for mobile
    const manifestPath = path.join('dist', 'mobile-manifest.json');
    const mobileManifest = {
      name: "Adventure Log",
      version: "1.0.1",
      platform: "mobile",
      build_date: new Date().toISOString(),
      platforms: ["android", "ios", "web"]
    };
    fs.writeFileSync(manifestPath, JSON.stringify(mobileManifest, null, 2));

    console.log('✅ Mobile build complete!');
    console.log('📱 Ready for:');
    console.log('   • Android (.apk/.aab)');
    console.log('   • iOS (.ipa/.app)');
    console.log('   • Web (PWA)');
    console.log('');
    console.log('🔄 Next steps:');
    console.log('   • Run "npm run mobile:sync" to sync with Capacitor');
    console.log('   • Run "npm run mobile:run:android" for Android');
    console.log('   • Run "npm run mobile:run:ios" for iOS');

  } catch (error) {
    console.error('❌ Mobile build failed:', error.message);
    console.error('💡 Troubleshooting tips:');
    console.error('   • Ensure all dependencies are installed: npm install');
    console.error('   • Check if Capacitor is properly configured');
    console.error('   • Verify Next.js configuration for mobile builds');
    process.exit(1);
  }
}

buildMobile();