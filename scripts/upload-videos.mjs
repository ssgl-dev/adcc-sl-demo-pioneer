/**
 * Upload sign language videos to Vercel Blob Storage.
 *
 * Usage:
 *   1. Install Vercel CLI: npm i -g vercel
 *   2. Login: vercel login
 *   3. Link project: vercel link
 *   4. Run: node scripts/upload-videos.mjs
 *
 * The script uploads all .mp4 files from adcc-site/video/
 * to Vercel Blob, then prints the blob URL to update manifest.json.
 */

import { put } from "@vercel/blob";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, basename } from "path";

const VIDEO_DIR = join(import.meta.dirname, "..", "adcc-site", "video");

async function uploadAll() {
  const allFiles = readdirSync(VIDEO_DIR);

  // Collect all .mp4 files (including in subdirectories)
  const videoFiles = [];
  for (const entry of allFiles) {
    const fullPath = join(VIDEO_DIR, entry);
    const stat = statSync(fullPath);
    if (stat.isFile() && entry.endsWith(".mp4")) {
      videoFiles.push({ name: entry, path: fullPath, size: stat.size });
    }
    if (stat.isDirectory()) {
      const subFiles = readdirSync(fullPath).filter((f) => f.endsWith(".mp4"));
      for (const sub of subFiles) {
        const subPath = join(fullPath, sub);
        videoFiles.push({
          name: `${entry}/${sub}`,
          path: subPath,
          size: statSync(subPath).size,
        });
      }
    }
  }

  console.log(
    `Found ${videoFiles.length} video files (${(
      videoFiles.reduce((s, f) => s + f.size, 0) /
      (1024 * 1024)
    ).toFixed(1)} MB total)\n`
  );

  let uploadedCount = 0;
  const blobBaseUrl = new Set();

  for (const file of videoFiles) {
    const buffer = readFileSync(file.path);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    try {
      const { url } = await put(`video/${file.name}`, buffer, {
        access: "public",
        addRandomSuffix: false,
      });
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
      blobBaseUrl.add(baseUrl);
      uploadedCount++;
      console.log(`[${uploadedCount}/${videoFiles.length}] ${file.name} (${sizeMB}MB) ✓`);
    } catch (err) {
      console.error(`[${uploadedCount + 1}/${videoFiles.length}] ${file.name} FAILED:`, err.message);
    }
  }

  console.log(`\nDone! Uploaded ${uploadedCount}/${videoFiles.length} files.`);
  if (blobBaseUrl.size > 0) {
    const baseUrl = [...blobBaseUrl][0];
    console.log(`\nUpdate public/data/manifest.json videoBasePath to:`);
    console.log(`  "${baseUrl}"`);
    console.log(`\nOr set environment variable in Vercel:`);
    console.log(`  NEXT_PUBLIC_VIDEO_BASE_URL=${baseUrl}`);
  }
}

uploadAll().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
