<template>
    <div class="map">
        <yandex-map
            :settings="{
                location: {
                    center: [37.617633, 55.755820],
                    zoom: 2
                },
            }"
        >
            <yandex-map-default-features-layer/>
            <yandex-map-default-scheme-layer/>

            <template v-if="ready">
                <yandex-map-feature
                    v-for="(fir, index) in dataStore.vatspy!.data.firs"
                    :key="fir.icao+index"
                    :settings="{...fir.feature, hideOutsideViewport: true, properties: {...fir.feature.properties, hint: fir.feature.id}}"
                />
                <yandex-map-hint hint-property="hint">
                    <template #default="{content}">
                        <div class="hint">
                            {{ content }}
                        </div>
                    </template>
                </yandex-map-hint>
            </template>
        </yandex-map>
    </div>
</template>

<script setup lang="ts">
import {
    YandexMap,
    YandexMapDefaultFeaturesLayer,
    YandexMapDefaultSchemeLayer,
    YandexMapFeature,
    YandexMapHint,
} from 'vue-yandex-maps';
import { useDataStore } from '~/store/data';
import type { VatsimData } from '~/types/data/vatsim';
import { clientDB } from '~/utils/client-db';
import type { VatSpyAPIData } from '~/types/data/vatspy';

const ready = ref(false);
const dataStore = useDataStore();

let interval: NodeJS.Timeout | null = null;

onMounted(async () => {
    //Data is not yet ready
    if (!dataStore.versions) {
        await new Promise<void>((resolve) => {
            const interval = setInterval(async () => {
                const { ready } = await $fetch('/data/status');
                if (ready) {
                    resolve();
                    clearInterval(interval);
                }
            }, 1000);
        });
    }

    if (!dataStore.versions) {
        dataStore.versions = await $fetch('/data/versions');
    }

    await Promise.all([
        (async function() {
            let vatspy = await clientDB.get('vatspy', 'index');
            if (!vatspy || vatspy.version !== dataStore.versions!.vatspy) {
                vatspy = await $fetch<VatSpyAPIData>('/data/vatspy');
                await clientDB.put('vatspy', vatspy, 'index');
            }

            dataStore.vatspy = shallowReactive(vatspy);
        }()),
        (async function() {
            const [vatsimData] = await Promise.all([
                $fetch<VatsimData>('/data/vatsim/data'),
            ]);
            dataStore.vatsim.data = vatsimData;
        }()),
    ]);

    interval = setInterval(async () => {
        dataStore.versions = await $fetch('/data/versions');
        if (dataStore.versions?.vatsim.data !== dataStore.vatsim.data?.general.update_timestamp) {
            dataStore.vatsim.data = Object.assign(dataStore.vatsim.data ?? {}, await $fetch<VatsimData>(`/data/vatsim/data?short=${ dataStore.vatsim.data ? 1 : 0 }`));
        }
    }, 1000);

    ready.value = true;
});

onBeforeUnmount(() => {
    if (interval) {
        clearInterval(interval);
    }
});

await useAsyncData(async () => {
    if (import.meta.server) {
        const {
            radarStorage,
            isDataReady,
            getDataVersions,
        } = await import('~/utils/backend/storage');
        if (!isDataReady()) return;

        dataStore.vatsim.data = radarStorage.vatsim.data;
        dataStore.versions = getDataVersions();
        return true;
    }

    return true;
});
</script>

<style lang="scss" scoped>
.map {
    width: 100dvw;
    height: 100dvh;
}

.hint {
    position: absolute;
    transform: translate(7px, -100%);
    padding: 4px;
    background: white;
    border: 1px solid black;
    opacity: 0.7;
    white-space: nowrap;
}
</style>
