/**
 * Generate PWA icons from the favicon SVG design.
 * Ensures PWA icons match the favicon (dark rounded square + white pen).
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// SVG template matching the favicon design — paths scaled from 32x32 original
function createIconSvg(size) {
  const scale = size / 32;
  const rx = 8 * scale;
  const sw = Math.max(1.5, 2 * scale);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#1a1a1a"/>
  <g transform="translate(6,6)" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M13.5 6.5l-1-1a2.12 2.12 0 0 0-3 0L3.5 11.5a2 2 0 0 0-.5.9l-.8 3.4a.5.5 0 0 0 .6.6l3.4-.8a2 2 0 0 0 .9-.5l6-6a2.12 2.12 0 0 0 0-3z"/>
    <line x1="10" y1="7" x2="13" y2="10"/>
    <line x1="2" y1="18" x2="18" y2="18"/>
  </g>
</svg>`;
}

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("sharp not found.");
    process.exit(1);
  }

  const sizes = [192, 512];

  for (const size of sizes) {
    const svg = createIconSvg(size);
    const buffer = Buffer.from(svg);
    const pngBuffer = await sharp(buffer)
      .resize(size, size)
      .png()
      .toBuffer();
    const outputPath = join(projectRoot, "public", `icon-${size}.png`);
    writeFileSync(outputPath, pngBuffer);
    console.log(`✅ Generated icon-${size}.png (${pngBuffer.length} bytes)`);
  }

  console.log("✅ All PWA icons generated!");
}

main().catch(console.error);
