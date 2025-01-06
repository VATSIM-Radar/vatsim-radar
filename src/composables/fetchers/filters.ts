import { useStore } from '~/store';
import type { UserFilter } from '~/utils/backend/handlers/filters';
import { customDefu } from '~/composables';
import { useFileDownload } from '~/composables/settings';

export function setUserFilter(settings?: UserFilter) {
    const store = useStore();

    const settingsText = localStorage.getItem('filters') ?? '{}';
    if (!settings && JSON.stringify(store.filter) === settingsText) return;

    let filters = JSON.parse(settingsText) as UserFilter;
    filters = customDefu(settings || {}, filters);

    store.filter = filters;
    localStorage.setItem('filters', JSON.stringify(filters));
}

export async function resetUserFilter() {
    const store = useStore();
    store.filter = {};
    localStorage.removeItem('filters');
}

export function setUserActiveFilter(settings?: UserFilter) {
    const store = useStore();

    const settingsText = localStorage.getItem('active-filters') ?? '{}';
    if (!settings && JSON.stringify(store.activeFilter) === settingsText) return;

    store.activeFilter = settings ?? JSON.parse(settingsText);
    if (settings) {
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
