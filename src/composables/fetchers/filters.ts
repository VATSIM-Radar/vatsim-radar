import { useStore } from '~/store';
import type { UserFilter } from '~/utils/backend/handlers/filters';
import { customDefu } from '~/composables';

export function setUserFilters(settings?: UserFilter) {
    const store = useStore();

    const settingsText = localStorage.getItem('filters') ?? '{}';
    if (!settings && JSON.stringify(store.filter) === settingsText) return;

    let filters = JSON.parse(settingsText) as UserFilter;
    filters = customDefu(settings || {}, filters);

    store.filter = filters;
    localStorage.setItem('filters', JSON.stringify(filters));
}

export async function resetUserMapSettings() {
    const store = useStore();
    store.filter = {};
    localStorage.removeItem('filters');
}
