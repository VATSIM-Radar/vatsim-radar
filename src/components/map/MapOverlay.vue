<template>
    <div v-show="false" v-if="model">
        <div class="map-overlay" ref="overlayElement" v-bind="$attrs">
            <slot/>
            <slot name="popup" v-if="isPopupOpen"/>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType, ShallowRef } from 'vue';
import type { Options } from 'ol/Overlay';
import { Overlay } from 'ol';
import type { Map } from 'ol';
import { useStore } from '~/store';

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

const store = useStore();

const id = useId();
const popupId = `${ id }-popup`;
const map = inject<ShallowRef<Map | null>>('map')!;
const overlayElement = ref<HTMLDivElement | null>(null);

const isPopupOpen = computed(() => {
    return store.openOverlayId === popupId;
});

watch([overlay, isPopupOpen], () => {
    const element = overlayElement.value?.parentElement;
    if (!element || !props.zIndex) return;

    if (isPopupOpen.value) {
        element.style.zIndex = (props.activeZIndex || (props.zIndex + 1)).toString();
    }
    else {
        element.style.zIndex = props.zIndex.toString();
    }
});

watch([model, popup, computed(() => store.openOverlayId)], async (_, [,, oldOverlayId]) => {
    await nextTick();
    if (model.value && !overlay.value) {
        overlay.value = new Overlay({
            ...props.settings,
            element: overlayElement.value!,
        });

        if (!props.persistent) store.openOverlayId = id;
        map.value!.addOverlay(overlay.value);
    }
    else if (model.value && overlay.value && !props.persistent && store.openOverlayId !== id) {
        map.value!.removeOverlay(overlay.value);
        overlay.value.dispose();
        overlay.value = null;
        return;
    }
    else if (!model.value && overlay.value) {
        map.value!.removeOverlay(overlay.value);
        overlay.value.dispose();
        overlay.value = null;
        return;
    }

    if (popup.value && oldOverlayId !== popupId) {
        store.openOverlayId = popupId;
    }
    else if (!popup.value && store.openOverlayId === popupId) {
        store.openOverlayId = null;
    }
}, {
    immediate: true,
});

watch(() => props.settings?.position, (val) => {
    if (!val) return;
    if (overlay.value) overlay.value.setPosition(val);
});

onBeforeUnmount(() => {
    if (overlay.value) {
        map.value!.removeOverlay(overlay.value);
        overlay.value.dispose();
        overlay.value = null;

        if (store.openOverlayId === overlay.value) store.openOverlayId = null;
    }
});
</script>
