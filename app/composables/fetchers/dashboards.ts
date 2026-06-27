import { toRaw } from 'vue';
import { useStore } from '~/store';
import type { UserDashboard } from '~/utils/server/handlers/dashboards';
import type { DashboardPayload } from '~/utils/shared/dashboard';

export async function createDashboard(payload: DashboardPayload, force = false) {
    const store = useStore();

    const result = await $fetch<{ id: number }>(`/api/user/dashboards${ force ? '?force=1' : '' }`, {
        method: 'POST',
        body: toRaw(payload),
    });
    await store.fetchDashboards();

    return result;
}

export async function updateDashboard(id: number, payload: Partial<DashboardPayload>, force = false) {
    const store = useStore();

    const result = await $fetch<{ id: number }>(`/api/user/dashboards/${ id }${ force ? '?force=1' : '' }`, {
        method: 'PUT',
        body: toRaw(payload),
    });
    await store.fetchDashboards();

    return result;
}

export async function deleteDashboard(id: number) {
    const store = useStore();

    const result = await $fetch(`/api/user/dashboards/${ id }`, {
        method: 'DELETE',
    });
    await store.fetchDashboards();

    return result;
}

export async function validateDashboard(payload: DashboardPayload) {
    return $fetch<{ status: 'ok' }>('/api/user/dashboards/validate', {
        method: 'POST',
        body: toRaw(payload),
    });
}

export function getUserDashboards(): UserDashboard[] {
    return useStore().dashboards;
}
