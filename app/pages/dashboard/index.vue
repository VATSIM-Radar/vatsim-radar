<template>
    <view-restricted-auth v-if="!store.user"/>
    <ui-page-container
        v-else
        class="dashboards"
    >
        <template #title>My Dashboards</template>

        <div class="dashboards_header">
            <ui-button
                :disabled="atCap"
                width="200px"
                @click="openCreate()"
            >
                <template #icon>
                    <plus-icon/>
                </template>
                Create new
            </ui-button>
        </div>

        <ui-notification
            v-if="atCap"
            class="dashboards_cap"
            type="info"
        >
            You have reached the maximum of {{ MAX_DASHBOARDS }} dashboards. Delete one to create another.
        </ui-notification>

        <div
            v-if="dashboards.length"
            class="dashboards_list"
        >
            <nuxt-link
                v-for="dashboard in dashboards"
                :key="dashboard.id"
                class="dashboards__item"
                :to="`/dashboard/${ dashboard.id }`"
            >
                <div class="dashboards__item_name">
                    {{ dashboard.name }}
                </div>
                <ui-bubble
                    v-if="dashboard.public"
                    class="dashboards__item_badge"
                >
                    Public
                </ui-bubble>
            </nuxt-link>
        </div>
        <div
            v-else
            class="dashboards_empty"
        >
            You don't have any dashboards yet. Create one to get started.
        </div>

        <dashboard-edit-popup
            v-model="editorOpen"
            :edit-dashboard="editDashboard"
            :prefill-airport="prefillAirport"
        />
    </ui-page-container>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import ViewRestrictedAuth from '~/components/views/ViewRestrictedAuth.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import DashboardEditPopup from '~/components/features/dashboard/DashboardEditPopup.vue';
import PlusIcon from '@/assets/icons/kit/plus.svg?component';
import { MAX_DASHBOARDS } from '~/utils/shared';
import type { UserDashboard } from '~/utils/server/handlers/dashboards';
import { useDataStore } from '~/composables/render/storage';
import { checkForUpdates, checkForVATSpy } from '~/composables/init';

const store = useStore();
const route = useRoute();
const router = useRouter();

useHead(() => ({
    title: 'My Dashboards',
}));

const dashboards = computed(() => store.dashboards);
const atCap = computed(() => dashboards.value.length >= MAX_DASHBOARDS);

const editorOpen = ref(false);
const editDashboard = ref<UserDashboard | null>(null);
const prefillAirport = ref<string | null>(null);

function openCreate(airport: string | null = null) {
    editDashboard.value = null;
    prefillAirport.value = airport;
    editorOpen.value = true;
}

onMounted(async () => {
    if (!store.user) return;
    if (!useDataStore().vatspy.value) {
        checkForUpdates().then(() => checkForVATSpy()).catch(() => {});
    }

    await store.fetchDashboards();


    if (route.query.new === '1') {
        const airport = typeof route.query.airport === 'string' ? route.query.airport.toUpperCase() : null;
        openCreate(airport);
        await router.replace({ query: {} });
    }
});
</script>

<style scoped lang="scss">
.dashboards {
    &_header {
        margin-bottom: 16px;
    }

    & &_cap {
        display: inline-flex;
        margin-bottom: 16px;
    }

    &_list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__item {
        cursor: pointer;

        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;

        padding: 16px;
        border: 1px solid $darkGray400;
        border-radius: 8px;

        color: $lightGray200;

        background: $darkGray900;

        transition: 0.3s;

        @include hover {
            &:hover {
                border-color: $blue500;
            }
        }

        &_name {
            font-size: 17px;
            font-weight: 600;
        }
    }

    &_empty {
        padding: 24px;
        border: 1px dashed $darkGray400;
        border-radius: 8px;

        color: $lightGray500;
        text-align: center;

        background: $darkGray900;
    }
}
</style>
