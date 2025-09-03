#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { gzipSync } = require("zlib");

// Bundle size budgets (in KB after gzip)
const BUDGETS = {
  // Main JS bundles
  "main-": 200,
  "vendor-": 1000,
  "common-": 100,
  "app/page-": 50,
  "app/layout-": 75,

  // Route-specific budgets
  "app/globe/page-": 150, // 3D libraries are larger
  "app/albums/page-": 75,
  "app/social/page-": 60,
  "app/dashboard/page-": 60,
  "app/auth/": 40,

  // Vendor chunks
  "vendor-": 1000,
  "chunks/": 80,

  // Total bundle budget
  TOTAL_JS: 1200,
  TOTAL_CSS: 100,
};

// File size thresholds for images
const IMAGE_BUDGETS = {
  "icons/": 50, // KB per icon
  "screenshots/": 500, // KB per screenshot
  DEFAULT_IMAGE: 100, // KB for other images
};

/**
 * Get gzipped size of a file in KB
 */
function getGzippedSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = gzipSync(content);
    return Math.round(gzipped.length / 1024);
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}`);
    return 0;
  }
}

/**
 * Get uncompressed size of a file in KB
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return Math.round(stats.size / 1024);
  } catch (error) {
    console.warn(`Warning: Could not stat file ${filePath}`);
    return 0;
  }
}

/**
 * Find all files matching a pattern in a directory
 */
function findFiles(dir, extensions = [".js", ".css"], excludePatterns = []) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  function walkDir(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        walkDir(itemPath);
      } else if (extensions.some((ext) => item.endsWith(ext))) {
        const relativePath = path.relative(dir, itemPath);

        // Skip excluded patterns
        if (excludePatterns.some((pattern) => relativePath.includes(pattern))) {
          continue;
        }

        files.push(itemPath);
      }
    }
  }

  walkDir(dir);
  return files;
}

/**
 * Check bundle budgets
 */
function checkBundleBudgets() {
  console.log("🔍 Analyzing bundle sizes...\n");

  const buildDir = path.join(process.cwd(), ".next");
  const staticDir = path.join(buildDir, "static");

  if (!fs.existsSync(staticDir)) {
    console.error("❌ Build directory not found. Run `npm run build` first.");
    process.exit(1);
  }

  // Find all JS and CSS files
  const jsFiles = findFiles(
    staticDir,
    [".js"],
    ["_buildManifest", "_ssgManifest"]
  );
  const cssFiles = findFiles(staticDir, [".css"]);

  let totalJsSize = 0;
  let totalCssSize = 0;
  const violations = [];
  const warnings = [];

  // Analyze JS files
  console.log("📦 JavaScript Bundles:");
  console.log("━".repeat(80));

  for (const filePath of jsFiles) {
    const relativePath = path.relative(staticDir, filePath);
    const filename = path.basename(filePath);
    const gzippedSize = getGzippedSize(filePath);
    const uncompressedSize = getFileSize(filePath);

    totalJsSize += gzippedSize;

    // Check against budgets
    let budgetKey = null;
    let budget = null;

    for (const [key, value] of Object.entries(BUDGETS)) {
      if (key !== "TOTAL_JS" && key !== "TOTAL_CSS" && filename.includes(key)) {
        budgetKey = key;
        budget = value;
        break;
      }
    }

    const status =
      budget && gzippedSize > budget
        ? "❌"
        : budget && gzippedSize > budget * 0.8
          ? "⚠️"
          : "✅";

    console.log(`${status} ${relativePath}`);
    console.log(
      `    📏 ${gzippedSize}KB gzipped (${uncompressedSize}KB uncompressed)`
    );

    if (budget) {
      console.log(
        `    📊 Budget: ${budget}KB (${Math.round((gzippedSize / budget) * 100)}% used)`
      );

      if (gzippedSize > budget) {
        violations.push({
          file: relativePath,
          size: gzippedSize,
          budget,
          overage: gzippedSize - budget,
        });
      } else if (gzippedSize > budget * 0.8) {
        warnings.push({
          file: relativePath,
          size: gzippedSize,
          budget,
          usage: Math.round((gzippedSize / budget) * 100),
        });
      }
    }
    console.log("");
  }

  // Analyze CSS files
  if (cssFiles.length > 0) {
    console.log("🎨 CSS Bundles:");
    console.log("━".repeat(80));

    for (const filePath of cssFiles) {
      const relativePath = path.relative(staticDir, filePath);
      const gzippedSize = getGzippedSize(filePath);
      const uncompressedSize = getFileSize(filePath);

      totalCssSize += gzippedSize;

      const status = gzippedSize > 50 ? "⚠️" : "✅";
      console.log(`${status} ${relativePath}`);
      console.log(
        `    📏 ${gzippedSize}KB gzipped (${uncompressedSize}KB uncompressed)\n`
      );
    }
  }

  // Check total budgets
  console.log("📈 Total Bundle Sizes:");
  console.log("━".repeat(80));

  const totalJsStatus =
    totalJsSize > BUDGETS.TOTAL_JS
      ? "❌"
      : totalJsSize > BUDGETS.TOTAL_JS * 0.8
        ? "⚠️"
        : "✅";
  const totalCssStatus =
    totalCssSize > BUDGETS.TOTAL_CSS
      ? "❌"
      : totalCssSize > BUDGETS.TOTAL_CSS * 0.8
        ? "⚠️"
        : "✅";

  console.log(
    `${totalJsStatus} Total JavaScript: ${totalJsSize}KB / ${BUDGETS.TOTAL_JS}KB (${Math.round((totalJsSize / BUDGETS.TOTAL_JS) * 100)}%)`
  );
  console.log(
    `${totalCssStatus} Total CSS: ${totalCssSize}KB / ${BUDGETS.TOTAL_CSS}KB (${Math.round((totalCssSize / BUDGETS.TOTAL_CSS) * 100)}%)\n`
  );

  if (totalJsSize > BUDGETS.TOTAL_JS) {
    violations.push({
      file: "TOTAL JavaScript",
      size: totalJsSize,
      budget: BUDGETS.TOTAL_JS,
      overage: totalJsSize - BUDGETS.TOTAL_JS,
    });
  }

  if (totalCssSize > BUDGETS.TOTAL_CSS) {
    violations.push({
      file: "TOTAL CSS",
      size: totalCssSize,
      budget: BUDGETS.TOTAL_CSS,
      overage: totalCssSize - BUDGETS.TOTAL_CSS,
    });
  }

  return { violations, warnings, totalJsSize, totalCssSize };
}

/**
 * Check image budgets
 */
function checkImageBudgets() {
  console.log("🖼️  Image Assets:");
  console.log("━".repeat(80));

  const publicDir = path.join(process.cwd(), "public");
  const imageFiles = findFiles(publicDir, [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
  ]);

  const violations = [];
  const warnings = [];
  let totalImageSize = 0;

  for (const filePath of imageFiles) {
    const relativePath = path.relative(publicDir, filePath);
    const fileSize = getFileSize(filePath);
    totalImageSize += fileSize;

    // Determine budget based on path
    let budget = IMAGE_BUDGETS.DEFAULT_IMAGE;
    for (const [path, budgetSize] of Object.entries(IMAGE_BUDGETS)) {
      if (path !== "DEFAULT_IMAGE" && relativePath.startsWith(path)) {
        budget = budgetSize;
        break;
      }
    }

    const status =
      fileSize > budget ? "❌" : fileSize > budget * 0.8 ? "⚠️" : "✅";

    console.log(
      `${status} ${relativePath}: ${fileSize}KB (budget: ${budget}KB)`
    );

    if (fileSize > budget) {
      violations.push({
        file: relativePath,
        size: fileSize,
        budget,
        overage: fileSize - budget,
      });
    } else if (fileSize > budget * 0.8) {
      warnings.push({
        file: relativePath,
        size: fileSize,
        budget,
        usage: Math.round((fileSize / budget) * 100),
      });
    }
  }

  console.log(
    `\n📊 Total Images: ${totalImageSize}KB across ${imageFiles.length} files\n`
  );

  return { violations, warnings, totalImageSize };
}

/**
 * Generate recommendations
 */
function generateRecommendations(bundleAnalysis, imageAnalysis) {
  console.log("💡 Optimization Recommendations:");
  console.log("━".repeat(80));

  const recommendations = [];

  // Bundle recommendations
  if (bundleAnalysis.totalJsSize > 600) {
    recommendations.push(
      "• Consider code splitting for large route components"
    );
    recommendations.push(
      "• Use dynamic imports for heavy 3D libraries (Three.js, R3F)"
    );
    recommendations.push(
      "• Implement tree shaking for unused utility functions"
    );
  }

  if (bundleAnalysis.violations.some((v) => v.file.includes("vendor"))) {
    recommendations.push("• Split vendor chunks more granularly");
    recommendations.push("• Consider using CDN for large external libraries");
  }

  if (bundleAnalysis.violations.some((v) => v.file.includes("globe"))) {
    recommendations.push("• Load 3D globe components lazily");
    recommendations.push("• Use simplified geometry for mobile devices");
  }

  // Image recommendations
  if (imageAnalysis.totalImageSize > 2000) {
    recommendations.push("• Convert PNG icons to SVG where possible");
    recommendations.push("• Use WebP format for photographs");
    recommendations.push("• Implement responsive images with srcset");
  }

  if (imageAnalysis.violations.length > 0) {
    recommendations.push("• Compress large images using sharp or imagemin");
    recommendations.push("• Consider progressive JPEG for large photos");
  }

  if (recommendations.length === 0) {
    console.log("✅ No optimization recommendations at this time!\n");
  } else {
    recommendations.forEach((rec) => console.log(rec));
    console.log("");
  }
}

/**
 * Main analysis function
 */
function main() {
  console.log("🚀 Adventure Log Bundle Analysis");
  console.log("═".repeat(80));
  console.log("");

  const bundleAnalysis = checkBundleBudgets();
  console.log("");

  const imageAnalysis = checkImageBudgets();
  console.log("");

  generateRecommendations(bundleAnalysis, imageAnalysis);

  // Summary
  const totalViolations =
    bundleAnalysis.violations.length + imageAnalysis.violations.length;
  const totalWarnings =
    bundleAnalysis.warnings.length + imageAnalysis.warnings.length;

  console.log("📋 Summary:");
  console.log("━".repeat(80));
  console.log(
    `✅ Budget compliant files: ${totalViolations === 0 ? "All files" : "Some files"}`
  );
  console.log(`⚠️  Warnings: ${totalWarnings}`);
  console.log(`❌ Violations: ${totalViolations}`);

  if (totalViolations > 0) {
    console.log("\n🚨 Budget Violations:");
    [...bundleAnalysis.violations, ...imageAnalysis.violations].forEach(
      (violation) => {
        console.log(
          `   ${violation.file}: ${violation.size}KB (${violation.overage}KB over budget)`
        );
      }
    );
  }

  // Exit with error code if there are violations
  if (totalViolations > 0) {
    console.log("\n💥 Build failed due to budget violations!");
    process.exit(1);
  } else {
    console.log("\n🎉 All budgets within limits!");
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkBundleBudgets,
  checkImageBudgets,
  BUDGETS,
  IMAGE_BUDGETS,
};
