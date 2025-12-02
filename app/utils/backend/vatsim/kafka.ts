import type {
    KafkaAD,
    KafkaAddClient,
    KafkaDelPlan,
    KafkaPD,
    KafkaPlan,
    KafkaRmClient,
} from '~/types/data/vatsim-kafka';
import { KafkaClientType } from '~/types/data/vatsim-kafka';
import { radarStorage } from '~/utils/backend/storage';
import type { VatsimController, VatsimPilot, VatsimPilotFlightPlan } from '~/types/data/vatsim';
import { sendWSEncodedData, wssPilots } from '~/utils/backend/vatsim/ws';

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
    if (event.Callsign && wssPilots[event.Callsign]) {
        wssPilots[event.Callsign].forEach(([, ws]) => sendWSEncodedData(`{"type": "updatePaused"}`, ws));
        updatedPilots.delete(event.Callsign);
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

export function kafkaUpdatePilot(event: KafkaPD) {
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
    };

    if (!pilot) {
        pilot = {
            ...fields,
            date: Date.now(),
            deleted: false,
        };
        radarStorage.vatsim.kafka.pilots[event.Callsign] = pilot;
    }
    else {
        const positionChanged = pilot.altitude && pilot.groundspeed && pilot.groundspeed < 100 && pilot.altitude < 25000 && (pilot.latitude !== fields.latitude || pilot.longitude !== fields.longitude);

        Object.assign(pilot, fields);
        pilot.date = Date.now();
        pilot.deleted = false;

        if (pilot.callsign && wssPilots[pilot.callsign]) {
            if (positionChanged) {
                wssPilots[pilot.callsign].forEach(([, ws]) => sendWSEncodedData(`{"type": "update", "heading": ${ event.Heading }, "coordinates": [${ event.Longitude }, ${ event.Latitude }]}`, ws));
                updatedPilots.add(pilot.callsign);
            }
            else {
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
