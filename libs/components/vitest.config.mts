import angular from "@analogjs/vite-plugin-angular";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    angular({
      tsconfig: "./tsconfig.spec.json",
    }),
    tsconfigPaths({ root: "../../" }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.spec.ts"],
    setupFiles: ["./test.setup.ts"],
    reporters: ["default"],
  },
});
