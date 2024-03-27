<template>
    <div>
        <yandex-map
            :settings="{
                location: {
                    center: [37.617633, 55.755820],
                    zoom: 2
                },
            }"
            height="100dvh"
            width="100dvw"
        >
            <yandex-map-default-features-layer/>
            <yandex-map-default-scheme-layer/>
            <yandex-map-feature
                v-for="(fir, index) in (data as typeof radarStorage).vatspy.data!.firs"
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
import { useAsyncData } from '#app';
import { radarStorage } from '~/utils/backend/storage';

const { data } = await useAsyncData(async () => {
    return useRequestEvent()!.context.radarStorage;
});
</script>

<style lang="scss">
html, body {
  padding: 0;
  margin: 0;
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
