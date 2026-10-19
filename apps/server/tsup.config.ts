import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  // Bundle the shared TS package; keep real npm deps external.
  noExternal: ["@gti/shared"],
});
