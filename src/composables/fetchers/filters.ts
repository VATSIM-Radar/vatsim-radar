import { useStore } from '~/store';
import type { UserFilter } from '~/utils/backend/handlers/filters';
import { useFileDownload } from '~/composables/settings';

export function setUserFilter(settings?: UserFilter) {
    const store = useStore();

    const settingsText = localStorage.getItem('filters') ?? '{}';

    store.filter = settings ?? JSON.parse(settingsText);

    if (settings) {
        localStorage.setItem('filters', JSON.stringify(settings));
    }
}

export async function resetUserFilter() {
    const store = useStore();
    store.filter = {};
    localStorage.removeItem('filters');
}

export function setUserActiveFilter(settings?: UserFilter, updateLocalStorage = true) {
    const store = useStore();

    const settingsText = localStorage.getItem('active-filters') ?? '{}';

    store.activeFilter = settings ?? JSON.parse(settingsText);
    if (settings && updateLocalStorage) {
        localStorage.setItem('active-filters', JSON.stringify(settings));
    }
}

export async function resetUserActiveFilter() {
    const store = useStore();
    store.activeFilter = {};
    localStorage.removeItem('active-filters');
    store.getVATSIMData();
}

export function backupUserFilter() {
    useFileDownload({
        fileName: `vatsim-radar-filter-${ Date.now() }.json`,
        mime: 'application/json',
        blob: new Blob([JSON.stringify(useStore().filter)], { type: 'application/json' }),
    });
}
