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
    const callsign = event.Callsign;
    if (!callsign) return;

    updatedPilots.delete(callsign);
    pilotVerticalSpeedEntries.delete(callsign);

    if (wssPilots[callsign]) {
        wssPilots[callsign].forEach(([, ws]) => sendWSEncodedData(`{"type": "updatePaused"}`, ws));
    }

    delete radarStorage.vatsim.kafka.pilots[callsign];
    delete radarStorage.vatsim.kafka.atc[callsign];
    delete radarStorage.vatsim.kafka.prefiles[callsign];
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
const pilotVerticalSpeedEntries = new Map<string, {
    altitude: VatsimPilot['altitude'];
    updatedAt: number;
    verticalSpeed: NonNullable<VatsimPilot['vertical_speed']>;
}>();

const verticalSpeedAltitudeTolerance = 50; // Ignore altitude noise below 50 ft.
const verticalSpeedMinTimeDiff = 3000; // Wait at least 3s before calculating VS.
const verticalSpeedZeroTimeDiff = 10000; // After 10s without meaningful altitude change, treat VS as 0.
const verticalSpeedMaxTimeDiff = 60000; // Reset stale samples after 60s gaps.

function setVerticalSpeedEntry(callsign: string, altitude: number, updatedAt: number, verticalSpeed = 0) {
    pilotVerticalSpeedEntries.set(callsign, {
        altitude,
        updatedAt,
        verticalSpeed,
    });

    return verticalSpeed;
}

// Thanks to Codex for this function, I was too stupid to write it myself. Feel free to suggest a better approach if you are reading this
function getVerticalSpeed(pilot: Partial<VatsimPilot> | undefined, event: KafkaPD, now: number): VatsimPilot['vertical_speed'] {
    const entry = pilotVerticalSpeedEntries.get(event.Callsign);
    const entryVerticalSpeed = entry?.verticalSpeed;
    const pilotVerticalSpeed = pilot?.vertical_speed;
    // Reuse the last finite VS while waiting for enough altitude/time delta.
    const previousVerticalSpeed = typeof entryVerticalSpeed === 'number' && Number.isFinite(entryVerticalSpeed)
        ? entryVerticalSpeed
        : typeof pilotVerticalSpeed === 'number' && Number.isFinite(pilotVerticalSpeed)
            ? pilotVerticalSpeed
            : 0;

    // Bad altitude or previously poisoned state should not make NaN stick forever.
    if (!Number.isFinite(event.Altitude)) return previousVerticalSpeed;
    if (!entry || !Number.isFinite(entry.altitude) || !Number.isFinite(entry.updatedAt)) return setVerticalSpeedEntry(event.Callsign, event.Altitude, now);

    const timeDiff = now - entry.updatedAt;

    // Out-of-order timestamps keep the previous value; long gaps start a fresh sample.
    if (timeDiff <= 0) return previousVerticalSpeed;
    if (timeDiff > verticalSpeedMaxTimeDiff) return setVerticalSpeedEntry(event.Callsign, event.Altitude, now);

    // Short intervals are too noisy, especially with 1s Kafka updates.
    if (timeDiff < verticalSpeedMinTimeDiff) return previousVerticalSpeed;

    const altitudeDiff = event.Altitude - entry.altitude;

    // Keep accumulating small altitude changes until we can confidently report 0.
    if (Math.abs(altitudeDiff) < verticalSpeedAltitudeTolerance) {
        return timeDiff < verticalSpeedZeroTimeDiff
            ? previousVerticalSpeed
            : setVerticalSpeedEntry(event.Callsign, event.Altitude, now);
    }

    // Calculate feet per minute from the accumulated altitude/time window.
    const verticalSpeed = Math.round(altitudeDiff / (timeDiff / 1000 / 60));
    if (!Number.isFinite(verticalSpeed)) return setVerticalSpeedEntry(event.Callsign, event.Altitude, now);

    return setVerticalSpeedEntry(event.Callsign, event.Altitude, now, verticalSpeed);
}

export function kafkaUpdatePilot(event: KafkaPD, updatedAt: number) {
    let pilot = radarStorage.vatsim.kafka.pilots[event.Callsign];
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
        vertical_speed: getVerticalSpeed(pilot, event, updatedAt),
    };

    if (!pilot) {
        pilot = {
            ...fields,
            date: updatedAt,
            deleted: false,
        };
        radarStorage.vatsim.kafka.pilots[event.Callsign] = pilot;
    }
    else {
        const positionChanged = pilot.altitude && pilot.groundspeed && pilot.groundspeed < 100 && pilot.altitude < 25000 && (pilot.latitude !== fields.latitude || pilot.longitude !== fields.longitude);

        Object.assign(pilot, fields);
        pilot.date = updatedAt;
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
