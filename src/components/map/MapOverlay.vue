<template>
    <div
        v-if="model"
        v-show="false"
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
import type { Options } from 'ol/Overlay';
import { Overlay } from 'ol';
import type { Map } from 'ol';
import { useMapStore } from '~/store/map';

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
});

const emit = defineEmits({
    id(id: string) {
        return true;
    },
    popupId(popupId: string) {
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

const mapStore = useMapStore();

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
});

const openOverlayId = computed(() => mapStore.openOverlayId);

function recreateOverlay(stopEvent: boolean) {
    // @ts-expect-error Ignore protected state
    if (!overlay.value || stopEvent === overlay.value.stopEvent) return;
    if (!overlay.value) return;

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

watch([model, popup, openOverlayId], async ([, popupVal], [, oldPopupVal, oldOverlayId]) => {
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
