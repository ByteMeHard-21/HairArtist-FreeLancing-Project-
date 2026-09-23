import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Keep the worker and its relative import matched to the installed MapLibre version.
const project = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(path.dirname(createRequire(import.meta.url).resolve("maplibre-gl/package.json")), "dist");
const destination = path.join(project, "public", "maplibre");
mkdirSync(destination, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(path.join(dist, file), path.join(destination, file));
}
