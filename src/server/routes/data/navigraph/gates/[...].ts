import { navigraphCurrentDb } from '~/utils/backend/navigraph-db';
import { handleH3Error, handleH3Exception } from '~/utils/backend/h3';
import type { NavigraphGate } from '~/types/data/navigraph';
import { fromServerLonLat } from '~/utils/backend/vatsim';

export default defineEventHandler(async (event) => {
    const splitted = event.path.split('/');
    const icao = splitted[splitted.length - 1]?.toUpperCase();
    const gates: NavigraphGate[] = [];

    if (icao.length !== 4) {
        handleH3Error({
            event,
            statusCode: 400,
            statusMessage: 'Invalid code',
        });
        return;
    }

    try {
        await new Promise<void>((resolve, reject) => {
            navigraphCurrentDb?.each(
                `SELECT gate_identifier, gate_latitude, gate_longitude, name, airport_identifier FROM tbl_gate WHERE airport_identifier = :icao ORDER BY gate_identifier ASC`,
                { ':icao': icao },
                (err, row: any) => {
                    if (err) return reject(err);

                    const coords = fromServerLonLat([parseFloat(row.gate_longitude), parseFloat(row.gate_latitude)]);

                    gates.push({
                        ...row,
                        gate_longitude: coords[0],
                        gate_latitude: coords[1],
                    });
                },
                (err) => {
                    if (err) return reject(err);
                    resolve();
                },
            );
        });
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }

    gates.forEach((gate, index) => {
        const nextGate = gates[index + 1];
        const afterNextGate = gates[index + 2];

        if (nextGate) {
            const pairs = [
                ['SE', 'NW'],
                ['SW', 'NE'],
                ['ES', 'WN'],
                ['WS', 'EN'],
                ['N', 'S'],
                ['W', 'E'],
            ];

            for (const pair of pairs) {
                if (
                    (gate.name.endsWith(pair[0]) && nextGate.name.endsWith(pair[1])) ||
                    (gate.name.endsWith(pair[1]) && nextGate.name.endsWith(pair[0]))
                ) {
                    gates.splice(index + 1, 1);
                    gate.name = gate.name.slice(0, gate.name.length - pair[0].length);
                    break;
                }

                if (
                    (gate.name.endsWith(pair[0] + '1') && nextGate.name.endsWith(pair[0] + '2')) ||
                    (gate.name.endsWith(pair[1] + '1') && nextGate.name.endsWith(pair[1] + '2'))
                ) {
                    gates.splice(index + 1, 1);
                    gate.name = gate.name.slice(0, gate.name.length - pair[0].length - 1);
                    break;
                }
            }

            if (gate.name.slice(-1) === nextGate.name.slice(-2).replace('R', '').replace('L', '')) {
                gate.gate_longitude = (gate.gate_longitude + nextGate.gate_longitude) / 2;
                gate.gate_latitude = (gate.gate_latitude + nextGate.gate_latitude) / 2;
                gates.splice(index + 1, 1);
            }
        }

        if (afterNextGate) {
            if (gate.name.slice(-1) === afterNextGate.name.slice(-2).replace('R', '').replace('L', '')) {
                gate.gate_longitude = (gate.gate_longitude + afterNextGate.gate_longitude) / 2;
                gate.gate_latitude = (gate.gate_latitude + afterNextGate.gate_latitude) / 2;
                gates.splice(index + 2, 1);
            }
        }
    });

    return gates;
});
