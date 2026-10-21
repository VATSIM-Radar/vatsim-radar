import type { AmdbResponseStructure } from '@navigraph/amdb';
import type { NavigraphStandInformation } from '~/types/data/navigraph';

type StandArea = AmdbResponseStructure['parkingstandarea']['features'][number]['properties'];
type StandLine = AmdbResponseStructure['standguidanceline']['features'][number]['properties'];

export function hasNavigraphStandInformation(information?: NavigraphStandInformation): boolean {
    if (!information) return false;
    const restrictions = Array.isArray(information.prohibitedAircraft) && information.prohibitedAircraft.some(aircraft => typeof aircraft === 'string' && aircraft.trim());
    const guidanceLines = Array.isArray(information.guidanceLines) && information.guidanceLines.some(line => line && Number.isInteger(line.id) && line.id >= 0 && ((typeof line.maximumWingspan === 'number' && Number.isFinite(line.maximumWingspan) && line.maximumWingspan > 0) || line.status === 'open' || line.status === 'closed'));
    return restrictions || guidanceLines;
}

export function getNavigraphStandInformation(
    area: Pick<StandArea, 'restacn'>,
    lines: Pick<StandLine, 'id' | 'wingspan' | 'status'>[],
): NavigraphStandInformation {
    const prohibitedAircraft = [...new Set(typeof area?.restacn === 'string' ? area.restacn.split('.').map(aircraft => aircraft.trim()).filter(Boolean) : [])];

    return {
        source: 'Navigraph AMDB',
        effectiveDate: null,
        prohibitedAircraft: prohibitedAircraft.length ? prohibitedAircraft : null,
        guidanceLines: (Array.isArray(lines) ? lines : []).filter(line => line && Number.isInteger(line.id) && line.id >= 0).map(line => ({
            id: line.id,
            maximumWingspan: Number.isFinite(line.wingspan) && line.wingspan > 0 ? line.wingspan : null,
            status: line.status === 0 ? 'closed' : line.status === 1 ? 'open' : null,
        })),
    };
}
