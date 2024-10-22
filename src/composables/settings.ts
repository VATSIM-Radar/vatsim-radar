import { useStore } from '~/store';
import type { IUserMapSettings, UserMapSettingsVisibilityATC } from '~/utils/backend/map-settings';
import { useMapStore } from '~/store/map';

export const isHideAtcType = (key: keyof UserMapSettingsVisibilityATC): boolean => {
    const store = useStore();

    if (store.mapSettings.heatmapLayer) return true;

    if (typeof store.mapSettings.visibility?.atc === 'object') {
        return !!store.mapSettings.visibility.atc[key];
    }

    return store.mapSettings.visibility?.atc === false;
};

export const isHideMapObject = (key: keyof IUserMapSettings['visibility']): boolean => {
    const store = useStore();
    const mapStore = useMapStore();

    if (store.mapSettings.heatmapLayer && key !== 'pilots' && (key !== 'airports' || mapStore.zoom < 6)) return true;

    return !!store.mapSettings.visibility?.[key];
};

export interface FileDownloadParams {
    blob: File | Blob | MediaSource;
    fileName: string;
    mime: string;
}

export function useFileDownload(options: FileDownloadParams): void {
    if (typeof document === 'undefined') {
        throw new Error('CSR-only method');
    }

    const linkElement = document.createElement('a');

    linkElement.setAttribute('href', window.URL.createObjectURL(options.blob));
    linkElement.setAttribute('download', options.fileName);
    linkElement.dataset.downloadurl = [options.mime, linkElement.download, linkElement.href].join(':');

    if (document.createEvent) {
        const mouseEvent = document.createEvent('MouseEvents');
        mouseEvent.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        linkElement.dispatchEvent(mouseEvent);
    }
    else {
        linkElement.click();
    }

    linkElement.remove();
}
