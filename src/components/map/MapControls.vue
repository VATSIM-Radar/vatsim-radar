<template>
    <div
        v-if="view"
        class="controls"
    >
        <template v-if="!isMobile">
            <common-button
                v-if="!isMobile"
                class="controls_item"
                size="S"
                :type="store.localSettings.distance?.enabled ? 'primary' : 'secondary-flat'"
                @click="setUserLocalSettings({ distance: { enabled: !store.localSettings.distance?.enabled } })"
            >
                <template #icon>
                    <ruler-icon/>
                </template>
            </common-button>
            <common-button
                class="controls_item"
                :disabled="mapStore.zoom >= view.getMaxZoom()"
                size="S"
                type="secondary-flat"
                @click="setZoom(true)"
            >
                <template #icon>
                    <plus-icon/>
                </template>
            </common-button>
            <common-button
                class="controls_item"
                :disabled="mapStore.zoom <= view.getMinZoom()"
                size="S"
                type="secondary-flat"
                @click="setZoom(false)"
            >
                <template #icon>
                    <minus-icon/>
                </template>
            </common-button>
            <common-button
                class="controls_item"
                size="S"
                type="secondary-flat"
                @click="setRotate(false)"
            >
                <template #icon>
                    <rotate-counterclockwise/>
                </template>
            </common-button>
        </template>
        <common-button
            v-if="!isMobile || mapStore.rotation !== 0"
            class="controls_item"
            :disabled="mapStore.rotation === 0"
            size="S"
            type="secondary-flat"
            @click="setRotate('reset')"
        >
            <template #icon>
                <rotate-reset/>
            </template>
        </common-button>
        <common-button
            v-if="!isMobile"
            class="controls_item"
            size="S"
            type="secondary-flat"
            @click="setRotate(true)"
        >
            <template #icon>
                <rotate-clockwise/>
            </template>
        </common-button>
    </div>
</template>

<script setup lang="ts">
import MinusIcon from '@/assets/icons/kit/minus.svg?component';
import PlusIcon from '@/assets/icons/kit/plus.svg?component';
import RotateClockwise from '@/assets/icons/kit/rotate-clockwise.svg?component';
import RotateCounterclockwise from '@/assets/icons/kit/rotate-counterclockwise.svg?component';
import RotateReset from '@/assets/icons/kit/reset.svg?component';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { useMapStore } from '~/store/map';
import { toDegrees, toRadians } from 'ol/math';
import RulerIcon from '@/assets/icons/kit/ruler.svg?component';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import { useStore } from '~/store';

const map = inject<ShallowRef<Map | null>>('map')!;
const store = useStore();
const mapStore = useMapStore();
const view = computed(() => map.value?.getView());
const isMobile = useIsMobile();

const setZoom = (increase: boolean) => {
    if (!view.value || view.value.getAnimating()) return;
    let zoom = mapStore.zoom;
    if (increase) {
        zoom++;
        if (zoom > view.value.getMaxZoom()) zoom = view.value.getMaxZoom();
    }
    else {
        zoom--;
        if (zoom < view.value.getMinZoom()) zoom = view.value.getMinZoom();
    }

    view.value?.animate({
        zoom,
        duration: 300,
    });
};

const setRotate = (increase: boolean | 'reset') => {
    if (!view.value) return;
    let rotate = toDegrees(view.value.getRotation());
    if (increase === true) {
        rotate += 45;
        if (rotate > 360) rotate -= 360;
    }
    else if (increase === false) {
        rotate -= 45;
        if (rotate < 0) rotate += 360;
    }
    else if (increase === 'reset') {
        rotate = 0;
    }

    view.value?.animate({
        rotation: toRadians(rotate),
        duration: 300,
    });
};
</script>

<style scoped lang="scss">
.controls {
    position: absolute;
    z-index: 6;
    bottom: 16px;
    left: 16px;

    display: flex;
    flex-direction: column;
    gap: 8px;
}
</style>
