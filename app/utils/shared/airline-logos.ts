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

export function getAirlineLogoUrls(callsign: string): string[] {
    const code = extractAirlineCode(callsign);
    if (!code) return [];
    return LOGO_SOURCES.map(base => `${ base }/${ code }.png`);
}

