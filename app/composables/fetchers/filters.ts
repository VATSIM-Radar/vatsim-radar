import { useStore, isFilterActive } from '~/store';
import type { UserFilter } from '~/utils/server/handlers/filters';
import { useFileDownload } from '~/composables/settings';
import { customDefu } from '~/composables';

export function setUserFilter(settings?: UserFilter, force = false) {
    const store = useStore();
    store.isFilterActive = isFilterActive().value.value ?? true;

    const settingsText = localStorage.getItem('filters') ?? '{}';
    if (!settings && JSON.stringify(store.filter) === settingsText) return;

    let localSettings = JSON.parse(settingsText) as UserFilter;
    localSettings = force && settings ? settings : customDefu(settings || {}, localSettings);

    store.filter = localSettings;
    localStorage.setItem('filters', JSON.stringify(localSettings));
}

export async function resetUserFilter() {
    const store = useStore();
    store.filter = {};
    localStorage.removeItem('filters');
}

export function setUserTemporaryFilter(settings: UserFilter) {
    const store = useStore();

    store.tempFilter = settings;
}

export async function resetUserTemporaryFilter() {
    const store = useStore();
    store.tempFilter = null;
    store.getVATSIMData();
}

export function backupUserFilter() {
    useFileDownload({
        fileName: `vatsim-radar-filter-${ Date.now() }.json`,
        mime: 'application/json',
        blob: new Blob([JSON.stringify(useStore().filter)], { type: 'application/json' }),
    });
}
