import { navigraphCurrentDb } from '~/utils/backend/navigraph-db';
import { handleH3Exception } from '~/utils/backend/h3';
import type { NavigraphGate } from '~/types/data/navigraph';
import { fromLonLat } from 'ol/proj';

export default defineEventHandler(async (event) => {
    const icao = getRouterParam(event, 'icao')?.toUpperCase();
    const gates: NavigraphGate[] = [];

    try {
        await new Promise<void>((resolve, reject) => {
            navigraphCurrentDb?.each(`SELECT gate_identifier, gate_latitude, gate_longitude, name, airport_identifier FROM tbl_gate WHERE airport_identifier = "${ icao }" ORDER BY gate_identifier ASC`, (err, row: any) => {
                if (err) reject(err);

                const coords = fromLonLat([parseFloat(row.gate_longitude), parseFloat(row.gate_latitude)]);

                let name = row.name;
                if (name.endsWith('S') || name.endsWith('N')) {
                    name = name.slice(0, name.length - 1);
                }

                if (name.endsWith('SE') || name.endsWith('NW') || name.endsWith('NE') || name.endsWith('SW')) {
                    name = name.slice(0, name.length - 2);
                }

                const identicalGate = gates.find(x => x.name === name);

                if (identicalGate) {
                    identicalGate.gate_longitude = (coords[0] + identicalGate.gate_longitude) / 2;
                    identicalGate.gate_latitude = (coords[1] + identicalGate.gate_latitude) / 2;
                    return;
                }

                gates.push({
                    ...row,
                    name,
                    gate_longitude: coords[0],
                    gate_latitude: coords[1],
                });
            }, (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    }
    catch (e) {
        handleH3Exception(event, e);
        return;
    }

    return gates;
});
