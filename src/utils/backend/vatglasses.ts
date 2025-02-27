import { $fetch } from 'ofetch';
import AdmZip from 'adm-zip';
import { setRedisData } from '~/utils/backend/redis';
import { radarStorage } from '~/utils/backend/storage';
import type { VatglassesData } from '~/utils/backend/storage';

const GITHUB_API_URL = 'https://api.github.com/repos/lennycolton/vatglasses-data/commits';
const GITHUB_ZIP_URL = 'https://github.com/lennycolton/vatglasses-data/archive/refs/heads/main.zip';
let currentSHA: string | null = null;

async function fetchLatestCommitSHA(postfix?: string): Promise<string> {
    const commits = await $fetch<{ sha: string }[]>(GITHUB_API_URL);

    if (postfix) return `${ commits[0].sha }-${ postfix }`;
    return commits[0].sha;
}

async function getStoredSHA(): Promise<string | null> {
    return (radarStorage.vatglasses.data)?.version ?? null;
}

async function downloadZip(url: string): Promise<AdmZip> {
    // @ts-expect-error Types error
    const zipBuffer = await $fetch<ArrayBuffer>(url, { responseType: 'arrayBuffer' });
    return new AdmZip(Buffer.from(zipBuffer));
}

function combineJsonFiles(zip: AdmZip): VatglassesData {
    const combinedData: VatglassesData = {};
    const zipEntries = zip.getEntries();

    const ignoredFiles = ['zse', 'ulll'];

    zipEntries.forEach(entry => {
        if (entry.entryName.endsWith('.json') && !ignoredFiles.some(x => entry.entryName.endsWith(`${ x }.json`))) {
            let fileName = entry.entryName.split('/').pop(); // Get the filename
            if (fileName) {
                try {
                    fileName = fileName.replace('.json', ''); // Remove the .json extension
                    const fileData = JSON.parse(entry.getData().toString('utf-8'));
                    combinedData[fileName] = fileData; // Use the filename as the key
                }
                catch (e) {
                    console.warn(`Error parsing ${ fileName }`, e);
                }
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
    const combinedDataMap = new Map(Object.entries(combinedData));

    // Loop through all entries in the Map and convert coordinates
    combinedDataMap.forEach((countryGroup, key) => {
        try {
            countryGroup.airspace.forEach(airspace => {
                airspace.sectors.forEach(sector => {
                    // @ts-expect-error: only temporary code
                    sector.points = sector.points.map(point => {
                        const [lat, lon] = point;
                        return [convertToDecimalDegrees(lon), convertToDecimalDegrees(lat)];
                    });
                });
            });
        }
        catch {
            // we catch the errors because we don't want to crash the server if there's an error in the vatglasses data
            combinedDataMap.delete(key);
        }
    });

    return Object.fromEntries(combinedDataMap);
}

export async function updateVatglassesData() {
    try {
        const latestSHA = await fetchLatestCommitSHA('3');
        if (!currentSHA) currentSHA = await getStoredSHA();

        if (latestSHA !== currentSHA) {
            const zip = await downloadZip(GITHUB_ZIP_URL);
            const combinedData = combineJsonFiles(zip);
            const convertedData = convertCoords(combinedData);

            const jsonData = { version: latestSHA, data: convertedData };

            currentSHA = latestSHA;

            radarStorage.vatglasses.data = jsonData;
            await setRedisData('data-vatglasses', jsonData, 1000 * 60 * 60 * 24 * 2);
        }
    }
    catch (error) {
        console.error('Error fetching data, ', error);
    }
}
