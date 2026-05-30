import type { UserMapSettingsVisibilityATC } from '~/utils/server/handlers/map-settings';
import { useMapStore } from '~/store/map';
import type { UserSettingsV2 } from '~/utils/settings/types';

export const isHideAtcType = (key: keyof UserMapSettingsVisibilityATC): boolean => {
    if (getKeyedValueFromSettings('map.layers.heatmap')) return true;

    return !getKeyedValueFromSettings(`map.visibility.atc.${ key }` as any);
};

export const isHideMapObject = (key: keyof UserSettingsV2['map']['visibility']): boolean => {
    const mapStore = useMapStore();

    if (getKeyedValueFromSettings('map.layers.heatmap') && key !== 'pilots' && (key !== 'airports' || mapStore.zoom < 6)) return true;

    return !getKeyedValueFromSettings(`map.visibility.${ key }` as any);
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

export const backupSettings = () => {
    useFileDownload({
        fileName: `vatsim-radar-settings-${ Date.now() }.json`,
        mime: 'application/json',
        blob: new Blob([JSON.stringify(useSettingsStore().settings)], { type: 'application/json' }),
    });
};

export const isDynamicAircraftScale = computed(() => {
    return getKeyedValueFromSettings('map.preferences.aircraft.dynamicScale');
});
