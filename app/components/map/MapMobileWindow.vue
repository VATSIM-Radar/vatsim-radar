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
        aria-label="Overlay details"
        :blocking="false"
        class="mobile-sheet"
        :default-snap="({ snapPoints: points }) => points[1]"
        :open="sheetOpen"
        :snap-points="snapPoints"
        @dismiss="closeSheet"
    >
        <map-overlays
            v-if="overlay && !overlay.minified"
            class="mobile-sheet_popup"
            max-height="unset"
            :overlay
        />
    </bottom-sheet>
</template>

<script setup lang="ts">
import { BottomSheet } from 'vue-bottom-sheets';
import 'vue-bottom-sheets/style.css';
import { useMapStore } from '~/store/map';
import MapOverlays from '~/components/map/overlays/MapOverlays.vue';
import PopupOverlay from '~/components/popups/PopupOverlay.vue';
import { useStore } from '~/store';
import NavigationFavorite from '~/components/features/navigation/NavigationFavorite.vue';
import MapFeaturedAirports from '~/components/map/MapFeaturedAirports.vue';

const store = useStore();
const mapStore = useMapStore();
const dataStore = useDataStore();

const overlay = computed(() => mapStore.overlays.find(x => x.id === mapStore.activeMobileOverlay));
const sheetOpen = computed(() => !!overlay.value && !overlay.value.minified);
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
    --vbs-max-width: 640px;
    --vbs-radius: 16px;
    --vbs-bg: #{$black};
    --vbs-color: #{$lightGray200};
    --vbs-backdrop: #{$blackAlpha64};
    --vbs-handle: #{$whiteAlpha24};
    --vbs-shadow: 0 -8px 40px #{$blackAlpha64};
    --vbs-transition-duration: 320ms;
    --vbs-transition-easing: cubic-bezier(0.22, 1, 0.36, 1);
    --vbs-z-index: 6;

    &_popup {
        width: 100%;
    }
}
</style>
