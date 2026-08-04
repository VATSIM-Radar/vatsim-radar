import { computed } from 'vue';
import type { Ref } from 'vue';
import rawCountryCodes from '~/data/country_codes.json';
import type { VatsimExtendedPilot, VatsimPrefile } from '~/types/data/vatsim';
import { getFlightPlanParam } from '~/utils/shared/vatsim';

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

const PREPARED_CODES: PreparedPrefix[] = (rawCountryCodes as CountryCodeEntry[])
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

export function getCountryFromCallsignOrReg(input?: string | null): CountryCodeEntry | null {
    if (!input) return null;

    const searchInput = input.replace(/-/g, '').trim().toUpperCase();

    for (const entry of PREPARED_CODES) {
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
    return `/flags/${ countryCode.toLowerCase() }.png`;
}

export function formatRegistration(registration: string | null | undefined, country: CountryCodeEntry | null): string {
    if (!registration || !country?.prefix) return registration || '';

    const clean = registration.replace(/-/g, '');
    const dashIndex = country.prefix.indexOf('-');
    if (dashIndex === -1) return clean;
    if (clean.length <= dashIndex) return clean;

    return `${ clean.slice(0, dashIndex) }-${ clean.slice(dashIndex) }`;
}

export function usePilotCountry(pilot: Ref<VatsimExtendedPilot | VatsimPrefile | undefined>) {
    return computed<CountryCodeEntry | null>(() => {
        if (!pilot.value) return null;

        const flightPlan = 'flight_plan' in pilot.value ? pilot.value.flight_plan : undefined;
        const rules = flightPlan?.flight_rules?.toUpperCase();

        if (rules === 'I') {
            const registration = getFlightPlanParam(flightPlan?.remarks, 'REG');
            if (!registration) return null;
            return getCountryFromCallsignOrReg(registration);
        }

        if (rules === 'V') {
            return getCountryFromCallsignOrReg(pilot.value.callsign);
        }

        return null;
    });
}
