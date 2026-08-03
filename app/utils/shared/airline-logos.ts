import airlineLogoOverrides from '~/utils/shared/airline-logo-overrides.json';

interface OverrideEntry {
    url: string;
    invert?: boolean;
}

const LOGO_SOURCES = [
    'https://raw.githubusercontent.com/Jxck-S/airline-logos/main/flightaware_logos',
    'https://raw.githubusercontent.com/Jxck-S/airline-logos/main/fr24_banners',
    'https://raw.githubusercontent.com/Jxck-S/airline-logos/main/radarbox_logos',
];

function extractAirlineCode(callsign: string): string | null {
    const upper = callsign.toUpperCase();
    const match = upper.match(/^([A-Z]{3})/);
    return match ? match[1] : null;
}

function resolveOverride(code: string): { url: string; invert: boolean } | null {
    const entry = airlineLogoOverrides[code];
    if (!entry) return null;

    if (typeof entry === 'string') {
        return { url: entry, invert: true };
    }

    const override = entry as OverrideEntry;
    return {
        url: override.url,
        invert: override.invert ?? true,
    };
}

export function getAirlineLogoUrls(callsign: string): Array<{ url: string; invert: boolean }> {
    const code = extractAirlineCode(callsign);
    if (!code) return [];

    const override = resolveOverride(code);
    if (override) {
        return [
            override,
            ...LOGO_SOURCES.map<{ url: string; invert: boolean }>(base => ({
                url: `${ base }/${ code }.png`,
                invert: true,
            })),
        ];
    }

    return LOGO_SOURCES.map<{ url: string; invert: boolean }>(base => ({
        url: `${ base }/${ code }.png`,
        invert: true,
    }));
}
