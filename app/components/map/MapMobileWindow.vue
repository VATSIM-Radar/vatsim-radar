<template>
    <transition name="mobile-window--item-appear">
        <div
            v-if="store.featuredAirportsOpen || store.menuFriendsOpen"
            class="mobile-window"
            :class="{ 'mobile-window--procedures': hasProcedures }"
            :style="{ '--minified-height': `${ overlaysHeight }px` }"
        >
            <popup-overlay
                v-if="store.featuredAirportsOpen"
                max-height="unset"
                model-value
                :sections="[{ key: 'content' }]"
                @update:modelValue="store.featuredAirportsOpen = false"
            >
                <template #title>
                    Featured Airports
                </template>
                <template #content>
                    <map-featured-airports/>
                </template>
            </popup-overlay>
            <popup-overlay
                v-else-if="store.menuFriendsOpen"
                max-height="unset"
                model-value
                :sections="[{ key: 'content' }]"
                @update:modelValue="store.menuFriendsOpen = false"
            >
                <template #title>
                    Favorite
                </template>
                <template #content>
                    <navigation-favorite/>
                </template>
            </popup-overlay>
        </div>
    </transition>

    <bottom-sheet
        ref="sheet"
        aria-label="Overlay details"
        :blocking="false"
        class="mobile-sheet"
        :default-snap="({ snapPoints: points }) => points[1]"
        :handle="false"
        :max-height="sheetMaxHeight"
        :open="sheetOpen"
        :snap-points="snapPoints"
        :theme="{ ...mapBottomSheetTheme, zIndex: 6 }"
        @dismiss="closeSheet"
        @snap="onSnap"
    >
        <template #default="{ dragHandleProps }">
            <template v-if="overlay && !overlay.minified">
                <div class="mobile-sheet_handle-zone">
                    <div
                        class="mobile-sheet_handle"
                        v-bind="dragHandleProps"
                    />
                </div>
                <map-overlays
                    class="mobile-sheet_popup"
                    max-height="unset"
                    :overlay
                />
            </template>
        </template>
    </bottom-sheet>
</template>

<script setup lang="ts">
import { BottomSheet } from 'vue-bottom-sheets';
import { mapBottomSheetTheme, useSheetMaxHeight } from '~/composables/map/bottom-sheet';
import { injectMap } from '~/composables/map';
import { useMapStore } from '~/store/map';
import MapOverlays from '~/components/map/overlays/MapOverlays.vue';
import PopupOverlay from '~/components/popups/PopupOverlay.vue';
import { useStore } from '~/store';
import NavigationFavorite from '~/components/features/navigation/NavigationFavorite.vue';
import MapFeaturedAirports from '~/components/map/MapFeaturedAirports.vue';

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const sheetMaxHeight = useSheetMaxHeight();

const sheet = useTemplateRef<InstanceType<typeof BottomSheet>>('sheet');
const map = injectMap();

const overlay = computed(() => mapStore.overlays.find(x => x.id === mapStore.activeMobileOverlay));
const sheetOpen = computed(() => !!overlay.value && !overlay.value.minified);

function setMapBottomPadding(bottom: number) {
    const view = map.value?.getView();
    if (view) view.padding = [0, 0, bottom, 0];
}

function onSnap(height: number) {
    setMapBottomPadding(sheetOpen.value ? height : 0);
}

watch(() => sheetOpen.value, open => {
    // Seed padding with the default (mid) snap height on open; @snap refines it.
    setMapBottomPadding(open ? Math.round(sheetMaxHeight.value * 0.6) : 0);
});

onBeforeUnmount(() => setMapBottomPadding(0));

watch(() => mapStore.mobileSheetCollapse, () => {
    sheet.value?.snapTo(({ snapPoints: points, height }) => {
        const mid = points[1];
        return height > mid ? mid : height;
    });
});

const hasProcedures = computed(() => Object.values(dataStore.navigraphProcedures.value).some(x => Object.keys(x!.sids).length || Object.keys(x!.stars).length || Object.keys(x!.approaches).length));

const snapPoints = ({ maxHeight, minHeight }: { maxHeight: number; minHeight: number }) => [
    Math.min(minHeight, Math.round(maxHeight * 0.3)),
    Math.round(maxHeight * 0.6),
    maxHeight,
];

function closeSheet() {
    if (overlay.value) overlay.value.minified = true;
    mapStore.activeMobileOverlay = null;
}

const overlaysHeight = computed(() => {
    const btnHeight = 32;
    const gap = 8;
    const perRow = 2;

    const rows = Math.ceil(mapStore.overlays.length / perRow);

    return (rows * btnHeight) + (gap * (rows - 1)) + 8;
});
</script>

<style scoped lang="scss">
.mobile-window {
    position: absolute;
    z-index: 6;
    top: 8px;
    left: 40px + 8px + 16px;

    display: flex;
    justify-content: flex-end;

    width: calc(100% - 40px - 8px - 8px - 16px);
    height: calc(100% - 48px - var(--minified-height));

    &--procedures {
        height: calc(100% - 32px - var(--minified-height) - 40px);
    }

    &_popup {
        width: 100%;
    }

    &--item-appear {
        &-enter-active,
        &-leave-active {
            transition: 0.3s;
        }

        &-enter-from,
        &-leave-to {
            top: -10px;
            opacity: 0;
        }
    }
}

.mobile-sheet {
    &_popup {
        flex: 1 0 auto;
        width: 100%;
    }

    &_handle-zone {
        position: sticky;
        z-index: 9;
        top: 0;

        overflow: visible;

        height: 0;
    }

    &_handle {
        cursor: grab;

        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);

        display: flex;
        align-items: center;
        justify-content: center;

        width: 64px;
        height: 16px;

        &::after {
            content: '';

            width: 36px;
            height: 4px;
            border-radius: 999px;

            background: var(--vbs-handle);
        }

        &:active {
            cursor: grabbing;
        }
    }
}
</style>

<style lang="scss">
.mobile-sheet {
    .vbs__content {
        overscroll-behavior: none;
    }

    .vbs__content-inner {
        display: flex;
        flex-direction: column;
        min-height: 100%;
        padding: 0;
    }

    .vbs__content-inner .info-popup {
        scrollbar-gutter: auto;
        overflow: visible;
        max-width: none;
        max-height: none;
    }

    .vbs__content-inner .info-popup_content {
        justify-content: flex-start;
    }

    .vbs__content-inner .info-popup__section:not(.info-popup__section--actions) {
        flex-grow: 0;
    }

    .vbs__content-inner .info-popup__section--actions {
        position: sticky;
        bottom: 0;
        margin-top: auto;
    }
}
</style>
