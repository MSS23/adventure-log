/**
 * Ultra-simple ESLint configuration for production deployment
 * Performance optimized - Next.js handles TypeScript checking
 */

import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignore patterns for performance
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      ".vercel/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "public/**",
    ],
  },

  // Use Next.js built-in ESLint config (includes TypeScript support)
  ...compat.extends("next/core-web-vitals"),

  // Production-focused rules
  {
    rules: {
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      // Allow console statements - they're needed for logging utilities
      "no-console": "off",
    },
  },

  // Specific overrides for logging files
  {
    files: ["lib/logger.ts", "lib/error-init.ts"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;