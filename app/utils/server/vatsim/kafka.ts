import type {
    KafkaAD,
    KafkaAddClient,
    KafkaDelPlan,
    KafkaPD,
    KafkaPlan,
    KafkaRmClient,
} from '~/types/data/vatsim-kafka';
import { KafkaClientType } from '~/types/data/vatsim-kafka';
import { radarStorage } from '~/utils/server/storage';
import type { VatsimController, VatsimPilot, VatsimPilotFlightPlan } from '~/types/data/vatsim';
import { sendWSEncodedData, wssPilots } from '~/utils/server/vatsim/ws';

export function kafkaAddClient(event: KafkaAddClient) {
    if (event.Type === KafkaClientType.Pilot) {
        radarStorage.vatsim.kafka.pilots[event.Callsign] = {
            cid: +event.Cid,
            server: event.Server,
            callsign: event.Callsign,
            name: event.RealName,
            date: Date.now(),
            deleted: false,
        };
    }
    else {
        radarStorage.vatsim.kafka.atc[event.Callsign] = {
            cid: +event.Cid,
            server: event.Server,
            callsign: event.Callsign,
            name: event.RealName,
            date: Date.now(),
            deleted: false,
        };
    }
}

export function kafkaRemoveClient(event: KafkaRmClient) {
    if (event.Callsign) {
        updatedPilots.delete(event.Callsign);
        pilotPositionUpdatedAt.delete(event.Callsign);
    }

    if (event.Callsign && wssPilots[event.Callsign]) {
        wssPilots[event.Callsign].forEach(([, ws]) => sendWSEncodedData(`{"type": "updatePaused"}`, ws));
    }
}

export function kafkaUpdateController(event: KafkaAD) {
    let controller = radarStorage.vatsim.kafka.atc[event.Callsign];

    const fields: Partial<VatsimController> = {
        callsign: event.Callsign,
        frequency: event.Frequency,
        facility: event.FacilityType,
    };

    if (!controller) {
        controller = {
            ...fields,
            date: Date.now(),
            deleted: false,
        };
        radarStorage.vatsim.kafka.atc[event.Callsign] = controller;
    }
    else {
        Object.assign(controller, fields);
        controller.date = Date.now();
        controller.deleted = false;
    }
}

const updatedPilots = new Set<string>();
const pilotPositionUpdatedAt = new Map<string, number>();

const verticalSpeedAltitudeTolerance = 50;

function getVerticalSpeed(pilot: Partial<VatsimPilot> | undefined, event: KafkaPD, now: number): VatsimPilot['vertical_speed'] {
    const previousPositionUpdatedAt = pilotPositionUpdatedAt.get(event.Callsign);
    if (!previousPositionUpdatedAt || typeof pilot?.altitude !== 'number') return 0;

    const altitudeDiff = event.Altitude - pilot.altitude;
    if (Math.abs(altitudeDiff) <= verticalSpeedAltitudeTolerance) return 0;

    const timeDiffMinutes = (now - previousPositionUpdatedAt) / 1000 / 60;
    if (timeDiffMinutes <= 0) return pilot.vertical_speed ?? 0;

    return Math.round(altitudeDiff / timeDiffMinutes);
}

export function kafkaUpdatePilot(event: KafkaPD) {
    let pilot = radarStorage.vatsim.kafka.pilots[event.Callsign];
    const now = Date.now();

    const qnhIhb = Number((29.92 - (event.PressureDifference / 1000.0)).toFixed(2));
    const qnhMb = Math.round(qnhIhb * 33.86389);

    const fields: Partial<VatsimPilot> = {
        callsign: event.Callsign,
        transponder: `0000${ event.Transponder.toString() }`.slice(-4),
        latitude: event.Latitude,
        longitude: event.Longitude,
        altitude: event.Altitude,
        groundspeed: event.Groundspeed,
        heading: event.Heading,
        qnh_i_hg: qnhIhb,
        qnh_mb: qnhMb,
        vertical_speed: getVerticalSpeed(pilot, event, now),
    };

    if (!pilot) {
        pilot = {
            ...fields,
            date: now,
            deleted: false,
        };
        radarStorage.vatsim.kafka.pilots[event.Callsign] = pilot;
    }
    else {
        const positionChanged = pilot.altitude && pilot.groundspeed && pilot.groundspeed < 100 && pilot.altitude < 25000 && (pilot.latitude !== fields.latitude || pilot.longitude !== fields.longitude);

        Object.assign(pilot, fields);
        pilot.date = now;
        pilot.deleted = false;

        if (pilot.callsign && wssPilots[pilot.callsign]) {
            if (positionChanged) {
                wssPilots[pilot.callsign].forEach(([, ws]) => sendWSEncodedData(`{"type": "update", "heading": ${ event.Heading }, "coordinates": [${ event.Longitude }, ${ event.Latitude }]}`, ws));
                updatedPilots.add(pilot.callsign);
            }
            else if (updatedPilots.has(pilot.callsign)) {
                wssPilots[pilot.callsign].forEach(([, ws]) => sendWSEncodedData(`{"type": "updatePaused"}`, ws));
                updatedPilots.delete(pilot.callsign);
            }
        }
    }

    pilotPositionUpdatedAt.set(event.Callsign, now);
}

export function kafkaUpdatePlan(event: KafkaPlan) {
    const fields: Partial<VatsimPilotFlightPlan> = {
        revision_id: +event.Revision,
        // @ts-expect-error I'm lazy to create type for that
        flight_rules: event.Type,
        aircraft_short: event.Aircraft,
        cruise_tas: event.Cruisespeed,
        departure: event.DepartureAirport,
        arrival: event.DestinationAirport,
        alternate: event.AlternateAirport,
        deptime: `0000${ event.EstimatedDepartureTime }`.slice(-4),
        altitude: event.Altitude,
        enroute_time: `${ (`0${ event.HoursEnroute }`).slice(-2) }${ (`0${ event.MinutesEnroute }`).slice(-2) }`,
        fuel_time: `${ (`0${ event.HoursFuel }`).slice(-2) }${ (`0${ event.MinutesFuel }`).slice(-2) }`,
        remarks: event.Remarks,
        route: event.Route,
        assigned_transponder: `0000${ String(event.AssignedTransponder) }`.slice(-4),
        locked: Boolean(event.HardLocked),
    };

    let pilot;

    if (event.Prefile) {
        pilot = radarStorage.vatsim.kafka.prefiles[event.Callsign];

        if (!pilot) {
            radarStorage.vatsim.kafka.prefiles[event.Callsign] = {
                flight_plan: fields,
                callsign: event.Callsign,
                cid: +event.Cid,
                name: event.RealName ?? undefined,
                date: Date.now(),
                deleted: false,
            };
            return;
        }
    }
    else {
        pilot = radarStorage.vatsim.kafka.pilots[event.Callsign];

        if (!pilot) {
            radarStorage.vatsim.kafka.pilots[event.Callsign] = {
                flight_plan: fields,
                callsign: event.Callsign,
                cid: +event.Cid,
                name: event.RealName ?? undefined,
                date: Date.now(),
                deleted: false,
            };
            return;
        }
        else {
            pilot.date = Date.now();
            pilot.flight_plan = fields;
        }
    }

    pilot.flight_plan = fields;
    pilot.date = Date.now();
    pilot.deleted = false;
}

export function kafkaRemovePlan(event: KafkaDelPlan) {
    /* const item = radarStorage.vatsim.kafka.prefiles.find(x => x.callsign === event.Callsign);
    if (item) item.deleted = true;*/
}
