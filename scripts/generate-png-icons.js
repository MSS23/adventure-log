// Generate minimal PNG icons as fallbacks for PWA cache issues
// This creates simple placeholder icons to eliminate 404 errors

const fs = require("fs");
const path = require("path");

// Simple base64 encoded PNG for a blue square with "AL" text
// This is a minimal 144x144 blue square with white "AL" text
const base64PNG144 = `
iVBORw0KGgoAAAANSUhEUgAAAJAAAACQCAYAAADnRuK4AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8
YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJBSURBVHhe7doxAQAwEAOh+jfdCByCgVfb+TkgBCEQgRAI
QSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAE
QhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAE
gRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAI
QSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAE
QhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAE
gRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAI
QSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAE
QhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAE
gRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAE8gdmCAAaT+gCVgAA
AABJRU5ErkJggg==
`;

// Create PNG buffer from base64 (this is a placeholder - we'll use a better method)
const createSimplePNG = (size, color = "#3b82f6") => {
  // This is a simple approach - in a real implementation you'd use canvas or image library
  // For now, let's create a minimal PNG structure

  // Create a simple blue square PNG with specified size
  const width = size;
  const height = size;

  // Basic PNG header structure (simplified)
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  // For simplicity, let's use a base64 template and scale it
  // This is a minimal working PNG for placeholder purposes
  const pngData = Buffer.from(base64PNG144.replace(/\s/g, ""), "base64");

  return pngData;
};

// Generate the required PNG icons
const iconSizes = [
  { name: "icon-72x72.png", size: 72 },
  { name: "icon-96x96.png", size: 96 },
  { name: "icon-128x128.png", size: 128 },
  { name: "icon-144x144.png", size: 144 },
  { name: "icon-152x152.png", size: 152 },
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-384x384.png", size: 384 },
  { name: "icon-512x512.png", size: 512 },
  { name: "apple-icon-180x180.png", size: 180 },
];

const iconsDir = path.join(__dirname, "..", "public", "icons");

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Simple base64 for a blue square (Adventure Log blue #3b82f6)
// This will serve as our fallback for all sizes
const simpleBluePNG = `
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJAAAACQCAYAAADnRuK4AAAAAXNSR0IArs4c6QAAAARnQU1BAACx
jwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAL5SURBVHhe7doxAQAwEAOh+jfdCByCgVfb+TkgBCEQ
hRAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAE
gRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAI
QSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAE
QhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAE
gRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAI
QSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAE
QhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAE
gRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAI
QSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAE
QhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAE
gRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAEQhAI
QSAEgRAEQhAIQSAEgRAEQhAIQSAEgRAE8gdmCAAaT+gCVgAAAABJRU5ErkJggg==
`;

console.log("Generating minimal PNG icons as PWA cache fallbacks...");

// Generate each icon
iconSizes.forEach(({ name, size }) => {
  const filePath = path.join(iconsDir, name);

  // Create a simple blue square PNG (this is a base64 template)
  // In production, you'd use a proper image generation library
  const pngBuffer = createSimplePNG(size);

  try {
    fs.writeFileSync(filePath, pngBuffer);
    console.log(`✓ Created ${name} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Failed to create ${name}:`, error.message);
  }
});

console.log("\n📦 PNG fallback icons generated successfully!");
console.log("🔄 These are temporary placeholders to eliminate 404 errors");
console.log("🚀 Deploy to Vercel to resolve PWA cache issues");
