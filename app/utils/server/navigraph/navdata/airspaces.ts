import { dbPartialRequest } from '~/utils/server/navigraph/db';
import type {
    NavDataFlightLevel,
    NavdataProcessFunction,
    NavigraphNavDataControlledAirspace,
    NavigraphNavDataRestrictedAirspace,
    NavigraphNavDataRestrictedAirspacePoint,
    ShortAirspace,
} from '~/utils/server/navigraph/navdata/types';
import type { RestrictiveAirspaceRecord } from '~/utils/shared/airspace';

export {
    connectAirspaceBoundaryPoints,
    restrictiveAirspaceFeatureToGeoJSON,
    restrictiveAirspaceToGeoJSON,
} from '~/utils/shared/airspace';

export type {
    AirspaceBoundaryPoint,
    AirspaceBoundaryVia,
    RestrictiveAirspaceFeatureData,
    RestrictiveAirspacePoint,
    RestrictiveAirspaceProperties,
    RestrictiveAirspaceRecord,
} from '~/utils/shared/airspace';

const flightLevels: NavDataFlightLevel[] = ['H', 'L', 'B'];

interface AirspaceRecordBase {
    arc_bearing?: number | null;
    arc_distance?: number | null;
    arc_origin_latitude?: number | null;
    arc_origin_longitude?: number | null;
    boundary_via: string;
    latitude?: number | null;
    longitude?: number | null;
    seqno: number;
}

interface ControlledAirspaceRecord {
    airspace_center?: string | null;
    airspace_classification?: string | null;
    airspace_type?: string | null;
    arc_bearing?: number | null;
    arc_distance?: number | null;
    arc_origin_latitude?: number | null;
    arc_origin_longitude?: number | null;
    area_code?: string | null;
    boundary_via: string;
    controlled_airspace_name?: string | null;
    flightlevel?: string | null;
    icao_code?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    lower_limit?: string | null;
    multiple_code?: string | null;
    seqno: number;
    time_code?: string | null;
    unit_indicator_lower_limit?: string | null;
    unit_indicator_upper_limit?: string | null;
    upper_limit?: string | null;
}

interface GroupedAirspace<TDefinition> {
    airspace: TDefinition;
    points: NavigraphNavDataRestrictedAirspacePoint[];
}

function getFlightLevel(data: string | null | undefined): NavDataFlightLevel {
    if (flightLevels.includes(data as NavDataFlightLevel)) return data as NavDataFlightLevel;
    return 'B';
}

function getAirspaceDefinition(item: RestrictiveAirspaceRecord): NavigraphNavDataRestrictedAirspace['airspace'] {
    return {
        areaCode: item.area_code ?? null,
        designation: item.restrictive_airspace_designation ?? null,
        flightLevel: getFlightLevel(item.flightlevel),
        icaoCode: item.icao_code ?? null,
        lowerLimit: item.lower_limit ?? null,
        lowerLimitUnit: item.unit_indicator_lower_limit ?? null,
        multipleCode: item.multiple_code ?? null,
        name: item.restrictive_airspace_name ?? null,
        type: item.restrictive_type ?? null,
        upperLimit: item.upper_limit ?? null,
        upperLimitUnit: item.unit_indicator_upper_limit ?? null,
    };
}

function getControlledAirspaceDefinition(item: ControlledAirspaceRecord): NavigraphNavDataControlledAirspace['airspace'] {
    return {
        areaCode: item.area_code ?? null,
        center: item.airspace_center ?? null,
        classification: item.airspace_classification ?? null,
        flightLevel: getFlightLevel(item.flightlevel),
        icaoCode: item.icao_code ?? null,
        lowerLimit: item.lower_limit ?? null,
        lowerLimitUnit: item.unit_indicator_lower_limit ?? null,
        multipleCode: item.multiple_code ?? null,
        name: item.controlled_airspace_name ?? null,
        timeCode: item.time_code ?? null,
        type: item.airspace_type ?? null,
        upperLimit: item.upper_limit ?? null,
        upperLimitUnit: item.unit_indicator_upper_limit ?? null,
    };
}

function getAirspacePoint(item: AirspaceRecordBase): NavigraphNavDataRestrictedAirspacePoint {
    return {
        arcBearing: item.arc_bearing ?? null,
        arcDistance: item.arc_distance ?? null,
        arcOrigin: item.arc_origin_longitude == null || item.arc_origin_latitude == null
            ? null
            : [item.arc_origin_longitude, item.arc_origin_latitude],
        boundaryVia: String(item.boundary_via ?? '').trim().toUpperCase(),
        coordinate: item.longitude == null || item.latitude == null
            ? null
            : [item.longitude, item.latitude],
        seqno: item.seqno,
    };
}

function getShortAirspace(
    airspace: GroupedAirspace<{ flightLevel: NavDataFlightLevel; lowerLimit: string | null; name: string | null; type: string | null; upperLimit: string | null }>,
    identifier: string | null,
): ShortAirspace {
    return [
        airspace.airspace.type,
        identifier,
        airspace.airspace.name,
        airspace.airspace.lowerLimit,
        airspace.airspace.upperLimit,
        airspace.airspace.flightLevel,
        airspace.points.map(point => [
            point.coordinate?.[0] ?? null,
            point.coordinate?.[1] ?? null,
            point.boundaryVia,
            point.arcOrigin?.[0] ?? null,
            point.arcOrigin?.[1] ?? null,
            point.arcBearing,
            point.arcDistance,
            point.seqno,
        ]),
    ];
}

function getAirspaceKey(item: RestrictiveAirspaceRecord, index: number) {
    return [
        item.area_code,
        item.icao_code,
        item.restrictive_type,
        item.restrictive_airspace_designation,
        item.multiple_code,
        index,
    ].map(item => item || 'default').join('-');
}

function groupAirspaces<TRecord extends AirspaceRecordBase, TDefinition>(
    records: TRecord[],
    getDefinition: (item: TRecord) => TDefinition,
    getKey: (item: TRecord, index: number) => string,
) {
    const airspaces: Record<string, GroupedAirspace<TDefinition>> = {};
    let currentKey: string | null = null;
    let currentIndex = 0;

    for (const item of records) {
        const previousAirspace = currentKey ? airspaces[currentKey] : null;

        if (!previousAirspace || previousAirspace.points[previousAirspace.points.length - 1]?.seqno >= item.seqno) {
            currentKey = getKey(item, currentIndex);
            currentIndex++;

            airspaces[currentKey] = {
                airspace: getDefinition(item),
                points: [],
            };
        }

        airspaces[currentKey!].points.push(getAirspacePoint(item));
    }

    return airspaces;
}

function getControlledAirspaceKey(item: ControlledAirspaceRecord, index: number) {
    return [
        item.area_code,
        item.icao_code,
        item.airspace_classification,
        item.airspace_type,
        item.airspace_center,
        item.multiple_code,
        index,
    ].map(item => item || 'default').join('-');
}

export const processNavdataRestrictedAirspace: NavdataProcessFunction = async ({ fullData, shortData, db }) => {
    const restricted = await dbPartialRequest<RestrictiveAirspaceRecord>({
        db,
        sql: 'SELECT arc_bearing, arc_distance, arc_origin_latitude, arc_origin_longitude, area_code, boundary_via, flightlevel, icao_code, latitude, longitude, lower_limit, multiple_code, restrictive_airspace_designation, restrictive_airspace_name, restrictive_type, seqno, unit_indicator_lower_limit, unit_indicator_upper_limit, upper_limit FROM tbl_ur_restrictive_airspace ORDER BY area_code, icao_code, restrictive_type, restrictive_airspace_designation, multiple_code, seqno',
        table: 'tbl_ur_restrictive_airspace',
    });

    fullData.restrictedAirspace = groupAirspaces(restricted, getAirspaceDefinition, getAirspaceKey);
    shortData.restrictedAirspace = {};

    for (const [key, airspace] of Object.entries(fullData.restrictedAirspace)) {
        shortData.restrictedAirspace[key] = getShortAirspace(airspace, airspace.airspace.designation);
    }
};

export const processNavdataControlledAirspace: NavdataProcessFunction = async ({ fullData, shortData, db }) => {
    const controlled = await dbPartialRequest<ControlledAirspaceRecord>({
        db,
        sql: 'SELECT airspace_center, airspace_classification, airspace_type, arc_bearing, arc_distance, arc_origin_latitude, arc_origin_longitude, area_code, boundary_via, controlled_airspace_name, flightlevel, icao_code, latitude, longitude, lower_limit, multiple_code, seqno, time_code, unit_indicator_lower_limit, unit_indicator_upper_limit, upper_limit FROM tbl_uc_controlled_airspace ORDER BY area_code, icao_code, airspace_classification, airspace_type, airspace_center, multiple_code, seqno',
        table: 'tbl_uc_controlled_airspace',
    });

    fullData.controlledAirspace = groupAirspaces(controlled, getControlledAirspaceDefinition, getControlledAirspaceKey);
    shortData.controlledAirspace = {};

    for (const [key, airspace] of Object.entries(fullData.controlledAirspace)) {
        shortData.controlledAirspace[key] = getShortAirspace({
            ...airspace,
            airspace: {
                ...airspace.airspace,
                type: airspace.airspace.classification,
            },
        }, airspace.airspace.center);
    }
};
