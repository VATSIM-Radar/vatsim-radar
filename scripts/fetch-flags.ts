import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Downloads the country flags used by the pilot overlays from flagcdn.com
// into `public/flags/{code}.png` so the app does not depend on an external
// CDN at runtime. Run via `yarn fetch:flags`.
interface CountryCodeEntry {
    prefix: string;
    countryCode: string;
    name?: string;
    afterPrefixLength?: number;
}

const SOURCE = (code: string) => `https://flagcdn.com/w160/${ code }.png`;
const OUTPUT = join(process.cwd(), 'public/flags');

const entries = JSON.parse(readFileSync(join(process.cwd(), 'app/data/country_codes.json'), 'utf-8')) as CountryCodeEntry[];
const codes = [...new Set(entries.map(entry => entry.countryCode.toLowerCase()))];

mkdirSync(OUTPUT, { recursive: true });

let downloaded = 0;
let failed = 0;

for (const code of codes) {
    const filePath = join(OUTPUT, `${ code }.png`);

    try {
        const response = await fetch(SOURCE(code));
        if (!response.ok) {
            console.error(`Failed (${ response.status }): ${ code }`);
            failed++;
            continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        writeFileSync(filePath, buffer);
        downloaded++;
    }
    catch (error) {
        console.error(`Failed: ${ code }`, error);
        failed++;
    }
}

console.log(`Done: ${ downloaded } downloaded, ${ failed } failed.`);
