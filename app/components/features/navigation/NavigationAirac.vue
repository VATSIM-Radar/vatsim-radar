<template>
    <div
        v-if="dataStore.versions.value?.navigraph"
        class="airac"
        :class="{ 'airac--current': !!store.user?.hasFms }"
        @click="!store.user?.hasFms ? store.airacPopup = true : undefined"
    >
        <div
            v-if="mapStore.isNavigraphUpdating"
            class="airac_update-icon"
        >
            <rotate-clockwise/>
        </div>
        <svg
            v-if="mapStore.isNavigraphUpdating"
            class="airac_progress"
            preserveAspectRatio="none"
            :style="{ '--progress': mapStore.navigraphUpdateProgress }"
            viewBox="0 0 300 160"
        >
            <rect
                class="bar"
                height="156"
                pathLength="100"
                rx="16"
                ry="16"
                width="296"
                x="2"
                y="2"
            />
        </svg>
        <ui-text
            class="airac_content"
            type="3b-medium"
        >
            <img
                alt="Navigraph"
                src="../../../assets/icons/header/navigraph.svg"
                width="20"
            >

            <template v-if="store.user?.hasFms">
                AIRAC {{
                    dataStore.versions.value.navigraph.current.split('-')[0]
                }}
            </template>
            <template v-else-if="mapStore.isNavigraphUpdating">
                AIRAC {{
                    dataStore.versions.value.navigraph.outdated.split('-')[0]
                }}
            </template>
            <template v-else>
                Connect Navigraph
            </template>
        </ui-text>
    </div>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import RotateClockwise from '@/assets/icons/kit/rotate-clockwise.svg?component';
import UiText from '~/components/ui/text/UiText.vue';

const dataStore = useDataStore();
const store = useStore();
const mapStore = useMapStore();
</script>

<style lang="scss" scoped>
.airac {
    cursor: pointer;
    position: relative;

    &_progress {
        content: '';

        position: absolute;
        z-index: 2;
        inset: 0;

        width: calc(100%);
        height: calc(100%);

        fill: none;
        stroke: $navigraphColor;
        stroke-dasharray: var(--progress) 100;
        stroke-width: 4;
    }

    &_update-icon {
        position: absolute;
        z-index: 3;
        top: -4px;
        left: -4px;

        display: flex;
        align-items: center;
        justify-content: center;

        aspect-ratio: 1/1;
        padding: 4px;
        border-radius: 8px;

        background: $navigraphColor;

        svg {
            @keyframes updateIcon {
                0% {
                    transform: rotate(0);
                }

                100% {
                    transform: rotate(360deg);
                }
            }
            transform-origin: center;
            width: 8px;
            animation: updateIcon 1.5s linear infinite;
        }
    }

    &_content {
        position: relative;

        display: flex;
        gap: 8px;
        align-items: center;
        align-self: stretch;

        height: 32px;
        padding: 0 8px 0 12px;
        border-radius: 8px;

        color: $typographyPrimary;

        background: linear-gradient(90deg, rgb(166, 48, 43, 0.2) 0%, rgb(166, 48, 43, 0) 100%), $darkGray900;
    }

    &--current .airac_content {
        cursor: default;
    }
}
</style>


