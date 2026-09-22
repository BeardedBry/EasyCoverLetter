import { generateSW } from "workbox-build";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = "out";

const { count, size, warnings } = await generateSW({
  globDirectory: outDir,
  globPatterns: [
    "**/*.{html,js,css,png,svg,ico,webmanifest,woff,woff2,txt,json}",
  ],
  swDest: join(outDir, "sw.js"),
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  navigateFallback: "/index.html",
  navigateFallbackDenylist: [/^\/sw\.js$/],
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.hostname === "api.openai.com",
      handler: "NetworkOnly",
    },
  ],
});

if (warnings.length) {
  for (const w of warnings) console.warn(w);
}

writeFileSync(
  join(outDir, "sw-version.txt"),
  `eastcoverletter-sw ${new Date().toISOString()}\n`,
);

console.log(
  `Generated service worker with ${count} precached entries (${(size / 1024).toFixed(1)} KiB).`,
);
