import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Librairies tierces vendorisées : pas de lint (code minifié externe).
  { ignores: ["assets/js/vendor/**", "assets/vendor/**"] },
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
]);
