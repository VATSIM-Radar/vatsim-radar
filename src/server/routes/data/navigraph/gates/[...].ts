import { navigraphCurrentDb } from '~/utils/backend/navigraph-db';
import { handleH3Error, handleH3Exception } from '~/utils/backend/h3';
import type { NavigraphGate } from '~/types/data/navigraph';
import { fromServerLonLat } from '~/utils/backend/vatsim';

export default defineEventHandler(async (event) => {
    const splitted = event.path.split('/');
    const icao = splitted[splitted.length - 1]?.toUpperCase();
    let gates: NavigraphGate[] = [];

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
        }

        const lrGate = gates.findIndex((x, xIndex) => index < xIndex && gate.name.slice(-1) === x.name.slice(-2).replace('R', '').replace('L', ''));

        if (lrGate !== -1) {
            gate.gate_longitude = (gate.gate_longitude + gates[lrGate].gate_longitude) / 2;
            gate.gate_latitude = (gate.gate_latitude + gates[lrGate].gate_latitude) / 2;
            gates.splice(lrGate, 1);
        }

        if (gate.name.endsWith('1') && gate.name !== '01') {
            const similarGates = gates.filter(x =>
                x.name.length === gate.name.length &&
                x.name.startsWith(gate.name.slice(0, gate.name.length - 1)) &&
                Math.abs(x.gate_latitude - gate.gate_latitude) < 20 &&
                Math.abs(x.gate_longitude - gate.gate_longitude) < 20,
            );

            if (similarGates.length > 1 && similarGates.length < 9) {
                if (similarGates.length === 2) {
                    gate.gate_longitude = (gate.gate_longitude + gates[1].gate_longitude) / 2;
                    gate.gate_latitude = (gate.gate_latitude + gates[1].gate_latitude) / 2;
                }

                gate.name = gate.name.slice(0, gate.name.length - 1);
                gates = gates.filter(x => !similarGates.some(y => y.name === x.name && y.name !== gate.name));
            }
        }
    });

    return gates;
});
