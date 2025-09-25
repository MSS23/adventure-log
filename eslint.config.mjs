import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
      // Mobile platform directories
      "android/**",
      "ios/**",
      // Generated build artifacts
      "**/*.pack",
      "**/*.chunk.js",
      "**/*.chunk.css",
      "**/*.map",
      "**/*build-manifest.json",
      "**/*loadable-manifest.json",
      // Mobile build assets
      "**/assets/public/**",
      "**/_next/**",
      "**/capacitor.build.gradle",
      // Node.js scripts directory
      "scripts/**",
      // Service worker and other JS files
      "public/sw.js",
    ],
  },
];

export default eslintConfig;
