<template>
    <transition name="mobile-window--item-appear">
        <div
            v-if="store.featuredAirportsOpen || store.menuFriendsOpen || (overlay && !overlay.minified)"
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
            <map-overlays
                v-else-if="overlay && !overlay.minified"
                class="mobile-window_popup"
                max-height="auto"
                :overlay
            />
        </div>
    </transition>
</template>

<script setup lang="ts">
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
const hasProcedures = computed(() => Object.values(dataStore.navigraphProcedures.value).some(x => Object.keys(x!.sids).length || Object.keys(x!.stars).length || Object.keys(x!.approaches).length));

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
</style>
