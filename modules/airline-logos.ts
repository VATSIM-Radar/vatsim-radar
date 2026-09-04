import { addImports, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

interface OverrideEntry {
    url: string;
    invert?: boolean;
}

// Fallback chain used when no override is set for an airline code.
const LOGO_SOURCES = [
    'https://raw.githubusercontent.com/Jxck-S/airline-logos/main/flightaware_logos',
    'https://raw.githubusercontent.com/Jxck-S/airline-logos/main/fr24_banners',
    'https://raw.githubusercontent.com/Jxck-S/airline-logos/main/radarbox_logos',
];

// Logos are processed at up to 128x128 and displayed at 24x24 via CSS.
const MAX_PROCESS_SIZE = 128;

// Pixels darker than this brightness are brightened to white for dark mode visibility.
const BRIGHTNESS_THRESHOLD = 64;

const resolver = createResolver(import.meta.url);

// User-provided overrides (URL overrides and per-airline processing flags).
const airlineLogoOverrides = JSON.parse(
    readFileSync(resolver.resolve('../app/data/airline-logo-overrides.json'), 'utf-8'),
) as Record<string, string | OverrideEntry>;

// Enumerate available airline codes from the upstream logo repository.
// Only used to bootstrap generation (no committed logos yet) or when forced.
async function fetchRemoteCodes(): Promise<Set<string>> {
    const codes = new Set<string>();

    for (const directory of ['flightaware_logos', 'fr24_banners', 'radarbox_logos']) {
        try {
            const response = await fetch(`https://api.github.com/repos/Jxck-S/airline-logos/contents/${ directory }`);
            if (!response.ok) continue;

            const files: Array<{ name: string }> = await response.json();
            for (const file of files) {
                const code = file.name.replace(/\.png$/i, '');
                if (/^[A-Z]{3}$/.test(code)) codes.add(code);
            }
        }
        catch {
            // Network failures are non-fatal; generation continues with committed logos only.
        }
    }

    return codes;
}

async function downloadLogo(url: string): Promise<Buffer | null> {
    try {
        const response = await fetch(url, { redirect: 'follow' });
        if (!response.ok) return null;

        return Buffer.from(await response.arrayBuffer());
    }
    catch {
        return null;
    }
}

// Resize and optionally brighten dark pixels to white, replicating the former
// client-side canvas thresholding so logos stay visible in dark mode.
async function processLogo(input: Buffer, invert: boolean): Promise<Buffer> {
    const metadata = await sharp(input).metadata();
    if (!metadata.width || !metadata.height) throw new Error('Invalid image dimensions');

    const scale = Math.min(MAX_PROCESS_SIZE / metadata.width, MAX_PROCESS_SIZE / metadata.height);
    const width = Math.max(1, Math.round(metadata.width * scale));
    const height = Math.max(1, Math.round(metadata.height * scale));

    const pipeline = sharp(input)
        .resize({ width, height, fit: 'inside', withoutEnlargement: true })
        .ensureAlpha()
        .raw();

    if (!invert) return pipeline.png().toBuffer();

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a > 0) {
            const brightness = (0.299 * r) + (0.587 * g) + (0.114 * b);

            if (brightness < BRIGHTNESS_THRESHOLD) {
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
            }
        }
    }

    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

function resolveOverrides(code: string): { url: string; invert: boolean } | null {
    const entry = airlineLogoOverrides[code];
    if (!entry) return null;

    if (typeof entry === 'string') return { url: entry, invert: true };

    return {
        url: entry.url,
        invert: entry.invert ?? true,
    };
}

export default defineNuxtModule(async (_, nuxt) => {
    const publicPath = resolver.resolve('../public/logos');

    if (!process.argv.includes('typecheck')) {
        const force = process.env.AIRLINE_LOGOS_FORCE === '1';

        mkdirSync(publicPath, { recursive: true });

        let codes = new Set<string>();
        for (const file of readdirSync(publicPath)) {
            if (file.endsWith('.png')) codes.add(file.slice(0, -4));
        }

        // Bootstrap from the remote listing only when no logos are committed yet.
        if (force || codes.size === 0) {
            const remoteCodes = await fetchRemoteCodes();
            if (remoteCodes.size > 0) codes = remoteCodes;
        }

        const manifest: string[] = [];

        for (const code of codes) {
            const filePath = join(publicPath, `${ code }.png`);

            if (!force && existsSync(filePath)) {
                manifest.push(code);
                continue;
            }

            const override = resolveOverrides(code);
            const sources = override ? [override.url] : LOGO_SOURCES.map(source => `${ source }/${ code }.png`);
            const invert = override?.invert ?? true;

            for (const source of sources) {
                const image = await downloadLogo(source);
                if (!image) continue;

                try {
                    const processed = await processLogo(image, invert);
                    writeFileSync(filePath, processed);
                    manifest.push(code);
                    break;
                }
                catch {
                    // Corrupt source; try the next one in the chain.
                }
            }
        }

        addTemplate({
            filename: 'radar/airline-logos.ts',
            getContents: () => `export const airlineLogos = new Set(${ JSON.stringify(manifest) });`,
            write: true,
        });
    }

    const path = resolver.resolve('../.nuxt/radar/airline-logos.ts');
    addImports([
        {
            name: 'airlineLogos',
            from: path,
        },
    ]);
});
