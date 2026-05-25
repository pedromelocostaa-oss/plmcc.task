/**
 * Generates all PWA icon + splash sizes from an embedded SVG.
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

// Brand colors
const BG = "#1A1A1A";
const ACCENT = "#E58430";

/**
 * Builds the app icon SVG.
 * @param {number} size
 * @param {boolean} maskable  — safe-zone padding (10% each side), no border-radius
 */
function iconSvg(size, maskable = false) {
  const pad = maskable ? size * 0.1 : 0;
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = inner / 2;
  const bgR = maskable ? 0 : size * 0.22;
  const fontSize = inner * 0.42;
  const ringR = r * 0.72;
  const strokeW = size * 0.035;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${bgR}" ry="${bgR}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${ACCENT}" stroke-width="${strokeW * 0.7}" opacity="0.18"/>
  <path
    d="M ${cx} ${cy - ringR} A ${ringR} ${ringR} 0 0 1 ${cx + ringR} ${cy}"
    fill="none" stroke="${ACCENT}" stroke-width="${strokeW}" stroke-linecap="round" opacity="0.9"
  />
  <text
    x="${cx}" y="${cy + fontSize * 0.36}"
    text-anchor="middle"
    font-family="system-ui,-apple-system,'SF Pro Display',Arial,sans-serif"
    font-size="${fontSize}" font-weight="800"
    fill="${ACCENT}"
  >HQ</text>
</svg>`;
}

/**
 * Builds a splash screen SVG at the given dimensions.
 * Centers a large icon mark on a dark background.
 */
function splashSvg(w, h) {
  const iconSize = Math.min(w, h) * 0.22;
  const cx = w / 2;
  const cy = h / 2;
  const ringR = iconSize * 0.42;
  const fontSize = iconSize * 0.42;
  const strokeW = iconSize * 0.06;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <!-- Subtle glow -->
  <circle cx="${cx}" cy="${cy}" r="${ringR * 2.2}" fill="${ACCENT}" opacity="0.04"/>
  <!-- Ring -->
  <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${ACCENT}" stroke-width="${strokeW * 0.5}" opacity="0.2"/>
  <!-- Arc -->
  <path
    d="M ${cx} ${cy - ringR} A ${ringR} ${ringR} 0 0 1 ${cx + ringR} ${cy}"
    fill="none" stroke="${ACCENT}" stroke-width="${strokeW}" stroke-linecap="round" opacity="0.9"
  />
  <!-- HQ -->
  <text
    x="${cx}" y="${cy + fontSize * 0.36}"
    text-anchor="middle"
    font-family="system-ui,-apple-system,'SF Pro Display',Arial,sans-serif"
    font-size="${fontSize}" font-weight="800"
    fill="${ACCENT}"
  >HQ</text>
  <!-- App name -->
  <text
    x="${cx}" y="${cy + fontSize * 0.36 + iconSize * 0.38}"
    text-anchor="middle"
    font-family="system-ui,-apple-system,'SF Pro Display',Arial,sans-serif"
    font-size="${iconSize * 0.13}" font-weight="500" letter-spacing="0.08em"
    fill="${ACCENT}" opacity="0.5"
  >PEDRO'S HQ</text>
</svg>`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const sizes = [72, 96, 128, 144, 152, 192, 256, 384, 512];

// ── Splash screen specs (device-width × device-height × dpr) ─────────────────
// Each entry: [deviceW, deviceH, dpr, filename]
const splashes = [
  [390, 844, 3, "splash-390"],   // iPhone 14, 13, 12
  [414, 896, 2, "splash-414"],   // iPhone XR, 11
  [375, 812, 3, "splash-375"],   // iPhone X, XS, 11 Pro
  [428, 926, 3, "splash-428"],   // iPhone 12/13/14 Pro Max
  [430, 932, 3, "splash-430"],   // iPhone 15 Pro Max
  [393, 852, 3, "splash-393"],   // iPhone 15, 15 Pro
];

async function generate() {
  console.log("Generating PWA icons…\n");

  for (const size of sizes) {
    const svg = Buffer.from(iconSvg(size, false));
    await sharp(svg).png().toFile(join(iconDir, `icon-${size}.png`));
    console.log(`  ✓ icon-${size}.png`);
  }

  for (const size of [192, 512]) {
    const svg = Buffer.from(iconSvg(size, true));
    await sharp(svg).png().toFile(join(iconDir, `icon-maskable-${size}.png`));
    console.log(`  ✓ icon-maskable-${size}.png`);
  }

  // apple-touch-icon (180px)
  const ati = Buffer.from(iconSvg(180, false));
  await sharp(ati).png().toFile(join(iconDir, "apple-touch-icon.png"));
  console.log("  ✓ apple-touch-icon.png");

  // favicon-32
  const fav = Buffer.from(iconSvg(32, false));
  await sharp(fav).png().toFile(join(iconDir, "favicon-32.png"));
  console.log("  ✓ favicon-32.png");

  console.log("\nGenerating iOS splash screens…\n");

  for (const [dw, dh, dpr, name] of splashes) {
    const pw = dw * dpr;
    const ph = dh * dpr;
    const svg = Buffer.from(splashSvg(pw, ph));
    await sharp(svg).png().toFile(join(splashDir, `${name}.png`));
    console.log(`  ✓ ${name}.png  (${pw}×${ph})`);
  }

  console.log("\nAll assets written to public/icons/ and public/splash/");
}

generate().catch((err) => { console.error(err); process.exit(1); });
