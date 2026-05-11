/**
 * Icon generation — from a single source PNG OR from scratch (using
 * the project's primary color + name initial). Outputs every asset the
 * Expo template references with correct sizes / aspect ratios:
 *
 *   icon.png            1024×1024  app icon (iOS, fallback elsewhere)
 *   adaptive-icon.png   1024×1024  Android adaptive foreground
 *                                  (content kept inside central 66%)
 *   splash-icon.png     1200×1200  splash logo (resizeMode: contain)
 *   favicon.png           48×48    web build
 *   appstore.png        1024×1024  App Store listing
 *   playstore.png        512×512   Google Play listing
 *
 * From-scratch mode draws a centred glyph (first letter of the project
 * name) on a colored background — same recipe used in the AnimatedSplash
 * so brand identity travels.
 *
 * From-PNG mode resizes the source square: pad with the primary color
 * if the source isn't square. Adaptive icon shrinks the source to fit
 * the 66% safe zone.
 */

import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';

const TARGETS = [
    { name: 'icon.png',          size: 1024, mode: 'square'   },
    { name: 'adaptive-icon.png', size: 1024, mode: 'adaptive' },
    { name: 'splash-icon.png',   size: 1200, mode: 'splash'   },
    { name: 'favicon.png',       size:   48, mode: 'square'   },
    { name: 'appstore.png',      size: 1024, mode: 'square'   },
    { name: 'playstore.png',     size:  512, mode: 'square'   }
];

function hexToRgb(hex) {
    const clean = hex.replace(/^#/, '');
    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16)
    };
}

function bgRgba(hex, alpha = 1) {
    const { r, g, b } = hexToRgb(hex);
    return { r, g, b, alpha };
}

// Pick a foreground color that's legible against the background. Simple
// luminance check — more sophisticated APCA contrast can come later.
function pickForeground(bgHex) {
    const { r, g, b } = hexToRgb(bgHex);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.55 ? '#0B0D0F' : '#FFFFFF';
}

// We can't trust SVG `dominant-baseline="central"` to render
// consistently across sharp's resvg backend — for some fonts the
// glyph ends up biased toward the top of the cell. Two-pass approach
// fixes that: render the glyph alone on a transparent canvas, then
// trim + center-composite it onto the icon background. Trim removes
// the empty space above/below the glyph so what gets centered IS
// the glyph itself, not its baseline-anchored bounding box.

function buildGlyphSvg({ size, fg, letter, glyphScale }) {
    const fontSize = Math.round(size * glyphScale);
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <text x="50%" y="50%" text-anchor="middle"
        dominant-baseline="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
        font-weight="700"
        font-size="${fontSize}"
        fill="${fg}">${letter}</text>
</svg>`;
}

function buildBackgroundSvg({ size, bg, cornerRadius }) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="0" y="0" width="${size}" height="${size}"
        rx="${cornerRadius}" ry="${cornerRadius}"
        fill="${bg}" />
</svg>`;
}

// Render a glyph PNG with the visible pixels trimmed to their bbox.
// Returned buffer is much smaller than the input canvas; sharp's
// `composite` will then center it perfectly via gravity.
async function trimmedGlyph({ canvasSize, fg, letter, glyphScale }) {
    const svg = buildGlyphSvg({
        size: canvasSize, fg, letter, glyphScale
    });
    return sharp(Buffer.from(svg))
        .png()
        .trim()
        .toBuffer();
}

async function renderFromScratch({ outDir, primaryColor, letter }) {
    const fg = pickForeground(primaryColor);

    for (const target of TARGETS) {
        if (target.mode === 'splash') {
            // Splash: glyph centered on a transparent canvas. The
            // colored background lives in app.json's splash.bgColor,
            // so the splash bg frames the trimmed glyph.
            const glyph = await trimmedGlyph({
                canvasSize: target.size,
                fg: primaryColor,
                letter,
                glyphScale: 0.55
            });
            await sharp({
                create: {
                    width: target.size,
                    height: target.size,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                }
            })
                .composite([{ input: glyph, gravity: 'center' }])
                .png()
                .toFile(path.join(outDir, target.name));
            continue;
        }

        if (target.mode === 'adaptive') {
            // Android adaptive: foreground only inside the central
            // 66% safe zone. Background lives in app.json.
            const glyph = await trimmedGlyph({
                canvasSize: target.size,
                fg: primaryColor,
                letter,
                glyphScale: 0.40
            });
            await sharp({
                create: {
                    width: target.size,
                    height: target.size,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                }
            })
                .composite([{ input: glyph, gravity: 'center' }])
                .png()
                .toFile(path.join(outDir, target.name));
            continue;
        }

        // Square icon — bg + glyph composited center.
        const cornerRadius = Math.round(target.size * 0.22);
        const bgSvg = buildBackgroundSvg({
            size: target.size,
            bg: primaryColor,
            cornerRadius
        });
        const glyph = await trimmedGlyph({
            canvasSize: target.size,
            fg,
            letter,
            glyphScale: 0.58
        });
        await sharp(Buffer.from(bgSvg))
            .composite([{ input: glyph, gravity: 'center' }])
            .png()
            .toFile(path.join(outDir, target.name));
    }
}

async function renderFromSource({ outDir, sourcePath, primaryColor }) {
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source image not found: ${sourcePath}`);
    }

    const { r, g, b } = hexToRgb(primaryColor);
    const bgFill = { r, g, b, alpha: 1 };

    for (const target of TARGETS) {
        let pipeline = sharp(sourcePath);

        if (target.mode === 'adaptive') {
            // Shrink to the central 66% safe zone, fill the rest with
            // transparent — Android draws the bg from app.json.
            const inner = Math.round(target.size * 0.66);
            const buf = await sharp(sourcePath)
                .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toBuffer();
            pipeline = sharp({
                create: {
                    width: target.size,
                    height: target.size,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                }
            }).composite([{ input: buf, gravity: 'center' }]);
        } else if (target.mode === 'splash') {
            // Centered logo on transparent canvas, scaled to ~55% so
            // the splash background color frames it.
            const inner = Math.round(target.size * 0.55);
            const buf = await sharp(sourcePath)
                .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .png()
                .toBuffer();
            pipeline = sharp({
                create: {
                    width: target.size,
                    height: target.size,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                }
            }).composite([{ input: buf, gravity: 'center' }]);
        } else {
            // Square fit, primary-color bars if source isn't square.
            pipeline = pipeline.resize(target.size, target.size, {
                fit: 'contain',
                background: bgFill
            });
        }

        const outPath = path.join(outDir, target.name);
        await pipeline.png().toFile(outPath);
    }
}

/**
 * Generate the full asset set into `outDir`.
 *
 * @param {object} args
 * @param {string} args.outDir       directory to write into (assets/)
 * @param {string} args.primaryColor hex color (#xxxxxx)
 * @param {string} args.letter       initial glyph for from-scratch mode
 * @param {string} [args.sourcePath] when set, resize this PNG instead
 *                                   of drawing from scratch
 */
export async function generateIcons({
    outDir,
    primaryColor,
    letter,
    sourcePath
}) {
    if (!fs.existsSync(outDir)) {
        await fs.promises.mkdir(outDir, { recursive: true });
    }
    if (sourcePath) {
        await renderFromSource({ outDir, sourcePath, primaryColor });
    } else {
        await renderFromScratch({ outDir, primaryColor, letter });
    }
    return TARGETS.map(t => path.join(outDir, t.name));
}

export const ICON_TARGETS = TARGETS;
