import { computed, type Ref } from 'vue';
import rawCountryCodes from '~/data/country_codes.json';
import type { VatsimExtendedPilot, VatsimPrefile } from '~/types/data/vatsim';
import { getFlightPlanParam } from '~/utils/shared/vatsim';

export interface CountryCodeEntry {
  prefix: string;
  countryCode: string;
  name?: string;
}

interface PreparedPrefix {
  cleanPrefix: string;
  length: number;
  original: CountryCodeEntry;
}

const PREPARED_CODES: PreparedPrefix[] = (rawCountryCodes as CountryCodeEntry[])
  .map((item) => {
    const cleanPrefix = (item.prefix || '').replace(/-/g, '').trim().toUpperCase();
    return {
      cleanPrefix,
      length: cleanPrefix.length,
      original: item,
    };
  })
  .filter((entry) => entry.cleanPrefix.length > 0)
  .sort((a, b) => b.length - a.length);

export function getCountryFromCallsignOrReg(input?: string | null): CountryCodeEntry | null {
  if (!input) return null;

  const searchInput = input.replace(/-/g, '').trim().toUpperCase();

  for (const entry of PREPARED_CODES) {
    if (searchInput.startsWith(entry.cleanPrefix)) {
      return entry.original;
    }
  }

  return null;
}

export function getFlagUrl(countryCode: string): string {
  return `https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`;
}

export function useIsVfr(pilot: Ref<VatsimExtendedPilot | VatsimPrefile | undefined>) {
  return computed(() => {
    if (!pilot.value || !('flight_plan' in pilot.value) || !pilot.value.flight_plan) {
      return false;
    }
    const rules = pilot.value.flight_plan.flight_rules?.toUpperCase() || '';
    return rules.startsWith('V');
  });
}

export function usePilotCountry(pilot: Ref<VatsimExtendedPilot | VatsimPrefile | undefined>) {
  return computed<CountryCodeEntry | null>(() => {
    if (!pilot.value) return null;

    const flightPlan = 'flight_plan' in pilot.value ? pilot.value.flight_plan : undefined;
    const isIfr = flightPlan?.flight_rules?.toUpperCase() === 'I';
    const registration = isIfr ? getFlightPlanParam(flightPlan?.remarks, 'REG') : null;

    const target = registration || pilot.value.callsign;

    return getCountryFromCallsignOrReg(target);
  });
}

export function useVfrCountry(pilot: Ref<VatsimExtendedPilot | VatsimPrefile | undefined>) {
  const isVfr = useIsVfr(pilot);

  return computed<CountryCodeEntry | null>(() => {
    if (!isVfr.value || !pilot.value) return null;

    const target = ('flight_plan' in pilot.value && pilot.value.flight_plan?.aircraft)
      ? pilot.value.flight_plan.aircraft
      : pilot.value.callsign;

    return getCountryFromCallsignOrReg(target);
  });
}