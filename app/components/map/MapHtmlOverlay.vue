<template>
    <bottom-sheet
        v-if="usesMobileSheet"
        aria-label="Map info"
        :blocking="false"
        class="map-overlay-sheet"
        :handle="false"
        :max-height="sheetMaxHeight"
        :open="model"
        :theme="{ ...mapBottomSheetTheme, zIndex: 10 }"
        @dismiss="emit('close')"
    >
        <template #default="{ dragHandleProps }">
            <div class="radar-vbs_handle-zone">
                <div
                    class="radar-vbs_handle"
                    v-bind="dragHandleProps"
                />
            </div>
            <div class="map-overlay map-overlay--sheet" v-bind="$attrs">
                <slot/>
                <slot
                    v-if="isPopupOpen"
                    name="popup"
                />
            </div>
        </template>
    </bottom-sheet>
    <div
        v-else-if="model"
        v-show="false"
        class="map-overlay-block"
    >
        <div
            v-show="persistent || canShowOverlay"
            ref="overlayElement"
            class="map-overlay"
            v-bind="$attrs"
        >
            <slot/>
            <slot
                v-if="isPopupOpen"
                name="popup"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import type { Options } from 'ol/Overlay.js';
import { Overlay } from 'ol';
import type { Map } from 'ol';
import { BottomSheet } from 'vue-bottom-sheets';
import { useMapStore } from '~/store/map';
import { mapBottomSheetTheme, useSheetMaxHeight } from '~/composables/map/bottom-sheet';

defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    settings: {
        type: Object as PropType<Options>,
        required: true,
    },
    /**
     * @description Ignores open overlay counter
     */
    persistent: {
        type: Boolean,
        default: false,
    },
    zIndex: {
        type: Number,
    },
    activeZIndex: {
        type: Number,
    },
    disableMobileInteraction: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits({
    id(id: string) {
        return true;
    },
    popupId(popupId: string) {
        return true;
    },
    close() {
        return true;
    },
});

defineSlots<{ default: () => any; popup: () => any }>();

const model = defineModel({
    type: Boolean,
    default: true,
});
const popup = defineModel('popup', {
    type: Boolean,
    default: false,
});
const overlay = defineModel('overlay', {
    type: Object as PropType<Overlay | null>,
    default: null,
});

const isMobile = useIsMobile();
const usesMobileSheet = computed(() => {
    return model.value && isMobile.value && !props.disableMobileInteraction && !props.persistent;
});

const mapStore = useMapStore();

const sheetMaxHeight = useSheetMaxHeight();

const id = useId();
const popupId = `${ id }-popup`;

if (id) {
    emit('id', id);
}
emit('popupId', popupId);

const map = inject<ShallowRef<Map | null>>('map')!;
const overlayElement = ref<HTMLDivElement | null>(null);

const isPopupOpen = computed(() => {
    return mapStore.openOverlayId === popupId && canShowOverlay.value;
});

const zIndex = computed(() => {
    return props.zIndex;
});

watch([overlay, isPopupOpen, zIndex], () => {
    const element = overlayElement.value?.parentElement;
    if (!element || !props.zIndex) return;

    if (isPopupOpen.value) {
        element.style.zIndex = (props.activeZIndex || (props.zIndex + 1)).toString();
    }
    else {
        element.style.zIndex = props.zIndex.toString();
    }
}, {
    immediate: true,
});

const openOverlayId = computed(() => mapStore.openOverlayId);

function recreateOverlay(stopEvent: boolean) {
    // @ts-expect-error Ignore protected state
    if (!overlay.value || stopEvent === overlay.value.stopEvent) return;

    map.value!.removeOverlay(overlay.value);
    overlay.value.dispose();
    overlay.value = new Overlay({
        stopEvent,
        ...props.settings,
        element: overlayElement.value!,
    });
    map.value!.addOverlay(overlay.value);
}

const canShowOverlay = computed(() => mapStore.canShowOverlay);

function removeOverlay() {
    if (!overlay.value) return;
    map.value!.removeOverlay(overlay.value);
    overlay.value.dispose();
    overlay.value = null;
    if (mapStore.openOverlayId === id) mapStore.openOverlayId = null;
}

watch([model, popup, openOverlayId, overlayElement, usesMobileSheet], async ([, popupVal], [, oldPopupVal, oldOverlayId]) => {
    if (usesMobileSheet.value) {
        removeOverlay();
        return;
    }

    if (!overlayElement.value) return;
    await nextTick();
    if (model.value && !overlay.value) {
        if (!props.persistent && mapStore.openOverlayId && mapStore.openOverlayId !== id) {
            removeOverlay();
            model.value = false;
            return;
        }

        overlay.value = new Overlay({
            stopEvent: false,
            ...props.settings,
            element: overlayElement.value!,
        });

        if (!props.persistent) mapStore.openOverlayId = id ?? null;
        map.value!.addOverlay(overlay.value);
    }
    else if (model.value && overlay.value && !props.persistent && mapStore.openOverlayId !== id) {
        removeOverlay();
        return;
    }
    else if (!model.value && overlay.value) {
        removeOverlay();
        return;
    }

    if (!oldPopupVal && popupVal && oldOverlayId !== popupId) {
        // if (mapStore.openOverlayId && mapStore.openOverlayId && mapStore.openOverlayId !== popupId) return;
        mapStore.openOverlayId = popupId;
    }
    else if (popup.value && mapStore.openOverlayId !== popupId) {
        popup.value = false;
    }
    else if (!popup.value && mapStore.openOverlayId === popupId) {
        mapStore.openOverlayId = null;
    }
}, {
    immediate: true,
});

const position = computed(() => props.settings?.position);
const positioning = computed(() => props.settings?.positioning);
const offset = computed(() => props.settings?.offset);
const stopEvent = computed(() => props.settings?.stopEvent && canShowOverlay.value);

watch(position, val => {
    if (!val) return;
    if (overlay.value) overlay.value.setPosition(val);
});

watch(positioning, val => {
    if (!val) return;
    if (overlay.value) overlay.value.setPositioning(val);
});

watch(offset, val => {
    if (!val) return;
    if (overlay.value) overlay.value.setOffset(val);
});

watch(stopEvent, val => {
    if (val === undefined) return;
    recreateOverlay(val);
});

onBeforeUnmount(() => {
    removeOverlay();

    if (mapStore.openOverlayId === id) mapStore.openOverlayId = null;
    if (mapStore.openOverlayId === popupId) mapStore.openOverlayId = null;
});
</script>

<style lang="scss">
.map-overlay-sheet {
    .vbs__header {
        padding: 8px 16px 0;
    }

    .vbs__content-inner {
        padding: 0;
    }

    .popup-block {
        padding: 0 10px;
        border: none;
        border-radius: 0;
        background: transparent;
    }

    .popup-block_title {
        position: sticky;
        z-index: 1;
        top: 0;
        background: var(--vbs-bg);
    }

    .radar-vbs_handle {
        top: 0;
    }
}
</style>

<style lang="scss" scoped>
@include mobileOnly {
    .map-overlay-block {
        position: absolute;
        z-index: 10;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);

        overflow: auto;
        display: flex;
        justify-content: center;

        width: 100%;
        max-height: 30dvh;
        padding: 0 20px;

        .map-overlay {
            width: 100%;
        }
    }
}
</style>
