import { validateDataReady } from '~/utils/backend/h3';
import { fromServerLonLat } from '~/utils/backend/vatsim/index';
import type { Position } from 'geojson';
import { ofetch } from 'ofetch';

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';


export default defineEventHandler(async event => {
    if (!validateDataReady(event)) return;

    let jsonData = {};
    async function loadSectors() {
        try {
            // const response = await ofetch('./data.json');
            // jsonData = response;
            // console.log('Loaded JSON data:', jsonData);
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);

            const filePath = join(__dirname, 'data.json'); // Adjust the path as needed
            const fileContent = await fs.readFile(filePath, 'utf8');
            jsonData = JSON.parse(fileContent);
        }
        catch (error) {
            console.error('Error loading sectors:', error);
        }
    }
    await loadSectors();
    const json = jsonData;


    // Loop through all keys in the data object and convert coordinates
    Object.keys(json.data).forEach(key => {
        const countryGroup = json.data[key];
        countryGroup.airspace.forEach(airspace => {
            airspace.sectors.forEach(sector => {
                sector.points = sector.points.map(point => {
                    const [lat, lon] = point;
                    return fromServerLonLat([convertToDecimalDegrees(lon), convertToDecimalDegrees(lat)]);
                });
            });
        });
    });

    function convertToDecimalDegrees(coordinate: string): number {
        const isNegative = coordinate.startsWith('-');
        const absCoordinate = isNegative ? coordinate.slice(1) : coordinate;

        const degrees = parseInt(absCoordinate.slice(0, -4), 10);
        const minutes = parseInt(absCoordinate.slice(-4, -2), 10);
        const seconds = parseInt(absCoordinate.slice(-2), 10);

        let decimalDegrees = degrees + (minutes / 60) + (seconds / 3600);
        if (isNegative) {
            decimalDegrees = -decimalDegrees;
        }

        return parseFloat(decimalDegrees.toFixed(7));
    }


    return json;
});
