import { computed } from 'vue';
import type { Ref } from 'vue';
import type { VatsimExtendedPilot, VatsimPrefile } from '~/types/data/vatsim.ts';
import { getFlightPlanParam } from '~/utils/shared/vatsim.ts';

export function getAirlineLogoUrl(callsign?: string | null): string | null {
    if (!callsign) return null;

    const code = callsign.toUpperCase().match(/^([A-Z]{3})/)?.[1];
    if (!code || !useDataStore().imagesData.airlines.includes(code)) return null;

    return `https://data.vatsim-radar.com/images/logos/${ code }.png?v=1`;
}

export interface CountryCodeEntry {
    prefix: string;
    countryCode: string;
    name?: string;
    afterPrefixLength?: number;
}

interface PreparedPrefix {
    cleanPrefix: string;
    length: number;
    original: CountryCodeEntry;
}

let preparedCodes: PreparedPrefix[] | undefined;

export function getCountryFromCallsignOrReg(input?: string | null): CountryCodeEntry | null {
    if (!input) return null;

    preparedCodes ??= useDataStore().imagesData.countriesData
        .map(item => {
            const cleanPrefix = (item.prefix || '').replace(/-/g, '').trim().toUpperCase();
            return {
                cleanPrefix,
                length: cleanPrefix.length,
                original: item,
            };
        })
        .filter(entry => entry.cleanPrefix.length > 0)
        .sort((a, b) => b.length - a.length);

    const searchInput = input.replace(/-/g, '').trim().toUpperCase();

    for (const entry of preparedCodes) {
        if (!searchInput.startsWith(entry.cleanPrefix)) continue;

        const afterLength = entry.original.afterPrefixLength;
        if (afterLength !== undefined && searchInput.length - entry.cleanPrefix.length !== afterLength) {
            continue;
        }

        return entry.original;
    }

    return null;
}

export function getFlagUrl(countryCode: string): string {
    return `https://data.vatsim-radar.com/images/flags/${ countryCode.toLowerCase() }.png`;
}

export function formatRegistration(registration: string | number | null | undefined, country: CountryCodeEntry | null): string {
    if (registration == null || !country?.prefix) return registration == null ? '' : String(registration);

    const clean = String(registration).replace(/-/g, '');
    const dashIndex = country.prefix.indexOf('-');
    if (dashIndex === -1) return clean;
    if (clean.length <= dashIndex) return clean;

    return `${ clean.slice(0, dashIndex) }-${ clean.slice(dashIndex) }`;
}

export interface PilotCountry {
    country: CountryCodeEntry | null;
    isVfr: boolean;
    isIfr: boolean;
}

export function usePilotCountry(pilot: Ref<VatsimExtendedPilot | VatsimPrefile | undefined>) {
    return computed<PilotCountry>(() => {
        if (!pilot.value) {
            return {
                country: null,
                isVfr: false,
                isIfr: false,
            };
        }

        const flightPlan = 'flight_plan' in pilot.value ? pilot.value.flight_plan : undefined;
        const rules = flightPlan?.flight_rules?.toUpperCase();

        const registration = getFlightPlanParam(flightPlan?.remarks, 'REG');
        return {
            country: registration ? getCountryFromCallsignOrReg(registration) : null,
            isVfr: rules !== 'I',
            isIfr: rules === 'I',
        };
    });
}
