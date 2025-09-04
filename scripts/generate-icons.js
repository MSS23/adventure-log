const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Icon sizes that need PNG versions
const iconSizes = [
  { file: "icon-72x72.svg", size: 72 },
  { file: "icon-96x96.svg", size: 96 },
  { file: "icon-128x128.svg", size: 128 },
  { file: "icon-144x144.svg", size: 144 },
  { file: "icon-152x152.svg", size: 152 },
  { file: "icon-192x192.svg", size: 192 },
  { file: "icon-384x384.svg", size: 384 },
  { file: "icon-512x512.svg", size: 512 },
  { file: "apple-icon-180x180.svg", size: 180 },
];

const iconsDir = path.join(__dirname, "../public/icons");

async function convertSvgToPng() {
  console.log("🎨 Converting SVG icons to PNG...");

  for (const icon of iconSizes) {
    const svgPath = path.join(iconsDir, icon.file);
    const pngPath = path.join(iconsDir, icon.file.replace(".svg", ".png"));

    try {
      // Check if SVG exists
      if (!fs.existsSync(svgPath)) {
        console.warn(`⚠️  SVG not found: ${icon.file}`);
        continue;
      }

      // Convert SVG to PNG
      await sharp(svgPath)
        .resize(icon.size, icon.size)
        .png({ quality: 90, compressionLevel: 8 })
        .toFile(pngPath);

      console.log(
        `✅ Generated: ${icon.file.replace(".svg", ".png")} (${icon.size}x${icon.size})`
      );
    } catch (error) {
      console.error(`❌ Failed to convert ${icon.file}:`, error.message);
    }
  }

  console.log("🎉 Icon conversion complete!");
}

convertSvgToPng().catch(console.error);
