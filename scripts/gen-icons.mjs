/**
 * Generates all PWA icon + splash sizes from the official amber logo PNGs.
 * Uses the 1024px source PNG as master, composites on dark background.
 * Run: node scripts/gen-icons.mjs
 */

import sharp from "sharp";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const iconDir = join(root, "public/icons");
const splashDir = join(root, "public/splash");
mkdirSync(iconDir, { recursive: true });
mkdirSync(splashDir, { recursive: true });

// Official logo source (1024px, transparent bg, amber circle with cc cutout)
const LOGO_SRC = "C:/Users/pront/Downloads/plmcc_logos/plmcc-final/png/symbol-filled-amber-1024.png";

// Brand colors
const BG_DARK = { r: 26, g: 26, b: 26, alpha: 1 };   // #1A1A1A
const ACCENT = "#E58430";

/**
 * Creates an icon PNG of `size` × `size`:
 *   - Dark rounded-rect background (squircle-ish)
 *   - Logo centered with padding
 *   - Optional: maskable (full-bleed, no border-radius)
 */
async function makeIcon(outPath, size, maskable = false) {
  const bgRadius = maskable ? 0 : Math.round(size * 0.22);
  const logoPad = maskable ? Math.round(size * 0.10) : Math.round(size * 0.12);
  const logoSize = size - logoPad * 2;

  // 1. Resize and prepare logo PNG
  const logoPng = await sharp(LOGO_SRC)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 2. Build SVG background with rounded corners
  const bgSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <rect width="${size}" height="${size}" rx="${bgRadius}" ry="${bgRadius}" fill="#1A1A1A"/>
     </svg>`
  );

  // 3. Composite: background → logo centered
  await sharp(bgSvg)
    .composite([{
      input: logoPng,
      left: logoPad,
      top: logoPad,
    }])
    .png()
    .toFile(outPath);
}

/**
 * Creates a splash screen PNG at physicalW × physicalH.
 * Centers the logo on a dark background with app name below.
 */
async function makeSplash(outPath, w, h) {
  const iconSize = Math.round(Math.min(w, h) * 0.18);
  const cx = Math.round((w - iconSize) / 2);
  const cy = Math.round((h - iconSize) / 2 - iconSize * 0.08);

  const logoPng = await sharp(LOGO_SRC)
    .resize(iconSize, iconSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const labelFontSize = Math.round(iconSize * 0.13);
  const labelY = cy + iconSize + Math.round(iconSize * 0.28);

  const bgSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
       <rect width="${w}" height="${h}" fill="#1A1A1A"/>
       <text
         x="${w / 2}" y="${labelY}"
         text-anchor="middle"
         font-family="system-ui,-apple-system,'SF Pro Display',Arial,sans-serif"
         font-size="${labelFontSize}" font-weight="500" letter-spacing="0.1em"
         fill="${ACCENT}" opacity="0.5"
       >PEDRO'S HQ</text>
     </svg>`
  );

  await sharp(bgSvg)
    .composite([{ input: logoPng, left: cx, top: cy }])
    .png()
    .toFile(outPath);
}

// ── Icon sizes ─────────────────────────────────────────────────────────────────
const sizes = [72, 96, 128, 144, 152, 192, 256, 384, 512];

// ── Splash specs (deviceW × deviceH × dpr) ────────────────────────────────────
const splashes = [
  [390, 844, 3, "splash-390"],   // iPhone 14, 13, 12
  [414, 896, 2, "splash-414"],   // iPhone XR, 11
  [375, 812, 3, "splash-375"],   // iPhone X, XS, 11 Pro
  [428, 926, 3, "splash-428"],   // iPhone 12/13/14 Pro Max
  [430, 932, 3, "splash-430"],   // iPhone 15 Pro Max
  [393, 852, 3, "splash-393"],   // iPhone 15, 15 Pro
];

async function generate() {
  console.log("Generating PWA icons from official amber logo…\n");

  for (const size of sizes) {
    const file = join(iconDir, `icon-${size}.png`);
    await makeIcon(file, size, false);
    console.log(`  ✓ icon-${size}.png`);
  }

  // Maskable variants
  for (const size of [192, 512]) {
    const file = join(iconDir, `icon-maskable-${size}.png`);
    await makeIcon(file, size, true);
    console.log(`  ✓ icon-maskable-${size}.png`);
  }

  // apple-touch-icon (180px)
  await makeIcon(join(iconDir, "apple-touch-icon.png"), 180, false);
  console.log("  ✓ apple-touch-icon.png");

  // favicon (32px)
  await makeIcon(join(iconDir, "favicon-32.png"), 32, false);
  console.log("  ✓ favicon-32.png");

  // favicon (16px)
  await makeIcon(join(iconDir, "favicon-16.png"), 16, false);
  console.log("  ✓ favicon-16.png");

  console.log("\nGenerating iOS splash screens…\n");

  for (const [dw, dh, dpr, name] of splashes) {
    const pw = dw * dpr;
    const ph = dh * dpr;
    await makeSplash(join(splashDir, `${name}.png`), pw, ph);
    console.log(`  ✓ ${name}.png  (${pw}×${ph})`);
  }

  console.log("\nAll assets written to public/icons/ and public/splash/");
}

generate().catch((err) => { console.error(err); process.exit(1); });
