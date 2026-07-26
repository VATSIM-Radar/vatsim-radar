import AdmZip from 'adm-zip';
import type { RedisData } from '~/utils/server/redis';
import { setRedisData } from '~/utils/server/redis';
import { radarStorage } from '~/utils/server/storage';
import type { VatglassesAirspace, VatglassesData } from '~/utils/server/storage';
import { getLocalFile, hasLocalFile, isDebug } from '~/utils/server/debug';
import githubRequest from '~/utils/server/github';

const GITHUB_API_URL = 'https://api.github.com/repos/lennycolton/vatglasses-data/commits';
const GITHUB_ZIP_URL = 'https://github.com/lennycolton/vatglasses-data/archive/refs/heads/main.zip';
let currentSHA: string | null = null;

async function fetchLatestCommitSHA(postfix?: string): Promise<string> {
    if (isDebug() && hasLocalFile('vatglasses.zip')) return Date.now().toString();
    const commits = await githubRequest<{ sha: string }[]>(GITHUB_API_URL);

    if (postfix) return `${ commits[0].sha }-${ postfix }`;
    return commits[0].sha;
}

async function getStoredSHA(): Promise<string | null> {
    return (radarStorage.vatglasses.data)?.version ?? null;
}

async function downloadZip(url: string): Promise<AdmZip> {
    const localZip = isDebug() && getLocalFile('vatglasses.zip');
    if (localZip) return new AdmZip(localZip);

    const zipBuffer = await githubRequest<ArrayBuffer, 'arrayBuffer'>(url, { responseType: 'arrayBuffer' });
    return new AdmZip(Buffer.from(zipBuffer));
}

function combineJsonFiles(zip: AdmZip): VatglassesData {
    const combinedData: VatglassesData = {};
    const zipEntries = zip.getEntries();

    const ignoredFiles = ['nodata'];

    zipEntries.forEach(entry => {
        if (entry.entryName.endsWith('.json') && !ignoredFiles.some(x => entry.entryName.endsWith(`${ x }.json`))) {
            const pathParts = entry.entryName.split('/');
            const fileName = pathParts.pop(); // Get the filename
            const folderPath = pathParts; // Get the folder path as an array

            if (fileName && fileName.endsWith('.json')) {
                try {
                    if (folderPath.length === 2) {
                        const fileData = JSON.parse(entry.getData().toString('utf-8'));
                        const key = fileName.replace('.json', ''); // Remove the .json extension
                        if (Array.isArray(fileData.airspace)) {
                            fileData.airspace = Object.fromEntries(
                                fileData.airspace.map((airspace: VatglassesAirspace, index: any) => [index, airspace]),
                            );
                        }
                        combinedData[key] = fileData; // Use the filename as the key
                    }
                    else if (folderPath.length === 3 && fileName === 'positions.json') {
                        // if the folderPath.length we know it is a subfolder, we use the positions.json as anchor
                        const fileData = JSON.parse(entry.getData().toString('utf-8'));
                        const key = folderPath[2];

                        // Check if airspace.json exists in the folder
                        const airspaceFilePath = folderPath.join('/') + '/airspace.json';
                        const airspaceEntry = zipEntries.find(e => e.entryName === airspaceFilePath);
                        if (airspaceEntry) {
                            const airspaceData = JSON.parse(airspaceEntry.getData().toString('utf-8'));
                            combinedData[key] = { ...airspaceData, ...fileData };
                        }
                    }
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
            Object.values(countryGroup.airspace).forEach(airspace => {
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
        const latestSHA = await fetchLatestCommitSHA('060425');
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
        else if (radarStorage.vatglasses.data.data) await setRedisData('data-vatglasses', radarStorage.vatglasses.data as RedisData['data-vatglasses'], 1000 * 60 * 60 * 24 * 2);
    }
    catch (error) {
        console.error('Error fetching data, ', error);
    }
}
