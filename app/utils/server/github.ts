import type { FetchRequest, FetchOptions, MappedResponseType, ResponseType } from 'ofetch';
import { $fetch } from 'ofetch';
import { isDebug, isNext } from '~/utils/server/debug';
import type { PartialRecord } from '~/types';

export default function githubRequest<T = any, R extends ResponseType = 'json'>(request: FetchRequest, options?: FetchOptions<R>): Promise<MappedResponseType<R, T>> {
    const token = process.env.GITHUB_ACCESS_TOKEN || (typeof useRuntimeConfig !== 'undefined' && useRuntimeConfig().GITHUB_ACCESS_TOKEN);

    if (!token) return $fetch<T, R>(request, options);

    return $fetch<T, R>(request, {
        ...options,
        headers: {
            ...options?.headers,
            authorization: `Bearer ${ token }`,
        },
    });
}

interface Release {
    name: string;
    prerelease: boolean;
    created_at: string;
    assets: {
        name: string;
        size: number;
        browser_download_url: string;
    }[];
}

export interface DesktopAppFile {
    name: string;
    size: number;
    downloadUrl: string;
    type: 'windows' | 'mac' | 'linux';
    architecture: 'x64' | 'arm64';
    portable: boolean;
}

export interface DesktopAppResponse {
    version: string;
    files: DesktopAppFile[];
}

const desktopAppFiles: PartialRecord<string, Pick<DesktopAppFile, 'type' | 'architecture' | 'portable'>> = {
    'vatsim-radar-darwin-arm64.dmg': { type: 'mac', architecture: 'arm64', portable: false },
    'vatsim-radar-darwin-arm64.zip': { type: 'mac', architecture: 'arm64', portable: true },
    'vatsim-radar-darwin-x64.dmg': { type: 'mac', architecture: 'x64', portable: false },
    'vatsim-radar-darwin-x64.zip': { type: 'mac', architecture: 'x64', portable: true },
    'vatsim-radar-linux-arm64.deb': { type: 'linux', architecture: 'arm64', portable: false },
    'vatsim-radar-linux-arm64.zip': { type: 'linux', architecture: 'arm64', portable: true },
    'vatsim-radar-linux-x64.deb': { type: 'linux', architecture: 'x64', portable: false },
    'vatsim-radar-linux-x64.zip': { type: 'linux', architecture: 'x64', portable: true },
    'vatsim-radar-win32-x64.exe': { type: 'windows', architecture: 'x64', portable: false },
    'vatsim-radar-win32-x64.zip': { type: 'windows', architecture: 'x64', portable: true },
};

export async function getDesktopAppRelease(): Promise<DesktopAppResponse | null> {
    const release = (isNext() || isDebug())
        ? (await githubRequest<Release[]>('https://api.github.com/repos/VATSIM-Radar/desktop-app/releases'))
            .filter(x => x.prerelease)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        : await githubRequest<Release>('https://api.github.com/repos/VATSIM-Radar/desktop-app/releases/latest').catch(() => null);

    if (!release) return null;

    const files: DesktopAppFile[] = [];

    for (const file of release.assets) {
        const fileData = desktopAppFiles[file.name];

        if (!fileData) continue;

        files.push({
            ...fileData,
            name: file.name,
            size: file.size,
            downloadUrl: file.browser_download_url,
        });
    }

    return {
        version: release.name.split(' ')[2],
        files,
    };
}
