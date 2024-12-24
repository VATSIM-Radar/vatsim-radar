import { $fetch } from 'ofetch';
import AdmZip from 'adm-zip';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { existsSync } from 'node:fs';
import { getRedis } from '~/utils/backend/redis';
import { radarStorage } from '~/utils/backend/storage';
import type { VatglassesData } from '~/utils/backend/storage';
import { fromServerLonLat } from '~/utils/backend/vatsim/index';

const GITHUB_API_URL = 'https://api.github.com/repos/lennycolton/vatglasses-data/commits';
const GITHUB_ZIP_URL = 'https://github.com/lennycolton/vatglasses-data/archive/refs/heads/main.zip';
const DATA_DIR = join(process.cwd(), 'src/data');
const JSON_FILE = join(DATA_DIR, 'vatglasses.json');
const redisPublisher = getRedis();
let currentSHA: string | null = null;

async function fetchLatestCommitSHA(): Promise<string> {
    const commits = await $fetch<{ sha: string }[]>(GITHUB_API_URL);
    return commits[0].sha;
}

function getStoredSHA(): string | null {
    if (existsSync(JSON_FILE)) {
        const jsonData = JSON.parse(readFileSync(JSON_FILE, 'utf-8'));
        return jsonData.version;
    }
    return null;
}

function storeDataInFile(jsonData: { version: string; data: VatglassesData }): void {
    writeFileSync(JSON_FILE, JSON.stringify(jsonData), 'utf-8');
}

async function downloadZip(url: string): Promise<AdmZip> {
    // @ts-expect-error Types error
    const zipBuffer = await $fetch<ArrayBuffer>(url, { responseType: 'arrayBuffer' });
    return new AdmZip(Buffer.from(zipBuffer));
}

async function getFileDataAndStore() {
    if (existsSync(JSON_FILE)) {
        const jsonData = JSON.parse(readFileSync(JSON_FILE, 'utf-8'));
        radarStorage.vatglasses.data = jsonData;
    }
}

function combineJsonFiles(zip: AdmZip): VatglassesData {
    const combinedData: VatglassesData = {};
    const zipEntries = zip.getEntries();

    zipEntries.forEach(entry => {
        if (entry.entryName.endsWith('.json')) {
            let fileName = entry.entryName.split('/').pop(); // Get the filename
            if (fileName) {
                fileName = fileName.replace('.json', ''); // Remove the .json extension
                const fileData = JSON.parse(entry.getData().toString('utf-8'));
                combinedData[fileName] = fileData; // Use the filename as the key
            }
        }
    });

    return combinedData;
}

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

function convertCoords(combinedData: VatglassesData): VatglassesData {
    // Loop through all keys in the data object and convert coordinates
    Object.keys(combinedData).forEach(key => {
        const countryGroup = combinedData[key];
        countryGroup.airspace.forEach(airspace => {
            airspace.sectors.forEach(sector => {
                // @ts-expect-error: only temporary code
                sector.points = sector.points.map(point => {
                    const [lat, lon] = point;
                    return fromServerLonLat([convertToDecimalDegrees(lon), convertToDecimalDegrees(lat)]);
                });
            });
        });
    });
    return combinedData;
}

export async function updateVatglassesData() {
    try {
        const latestSHA = await fetchLatestCommitSHA();
        if (!currentSHA) currentSHA = getStoredSHA();

        if (latestSHA !== currentSHA) {
            const zip = await downloadZip(GITHUB_ZIP_URL);
            const combinedData = combineJsonFiles(zip);
            const convertedData = convertCoords(combinedData);

            const jsonData = { version: latestSHA, data: convertedData };

            storeDataInFile(jsonData);
            currentSHA = latestSHA;

            radarStorage.vatglasses.data = jsonData;

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject('Failed by timeout'), 5000);
                redisPublisher.publish('vatglassesData', 'updated', err => {
                    clearTimeout(timeout);
                    if (err) return reject(err);
                    resolve();
                });
            });
        }
        else {
            await getFileDataAndStore();
        }
    }
    catch (error) {
        console.error('Error fetching data, getting now already stored data:', error);
        await getFileDataAndStore();
    }
}
