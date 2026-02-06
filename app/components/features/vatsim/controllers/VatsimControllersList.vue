<template>
    <div
        class="atc-popup-container"
        :class="{
            'atc-popup-container--absolute': absolute,
            'atc-popup-container--small': small,
        }"
    >
        <popup-map-info
            class="atc-popup"
            content-padding="0"
        >
            <template
                v-if="$slots.title"
                #title
            >
                <slot name="title"/>
            </template>
            <template
                v-if="$slots.additionalTitle"
                #additionalTitle
            >
                <slot name="additionalTitle"/>
            </template>
            <div class="atc-popup_list">
                <vatsim-controller-info
                    v-for="(controller, controllerIndex) in controllers"
                    :key="controller.cid + controllerIndex"
                    :controller="controller"
                    :show-atis="showAtis"
                    :show-facility="showFacility"
                    @overlay="emit('overlay')"
                />
            </div>
        </popup-map-info>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { VatsimShortenedController } from '~/types/data/vatsim';
import VatsimControllerInfo from '~/components/features/vatsim/controllers/VatsimControllerInfo.vue';
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';

defineProps({
    controllers: {
        type: Array as PropType<VatsimShortenedController[]>,
        required: true,
    },
    showFacility: {
        type: Boolean,
        default: false,
    },
    showAtis: {
        type: Boolean,
        default: false,
    },
    absolute: {
        type: Boolean,
        default: false,
    },
    small: {
        type: Boolean,
        default: false,
    },
    maxHeight: {
        type: String,
        default: '400px',
    },
});

const emit = defineEmits({
    overlay() {
        return true;
    },
});
defineSlots<{ title?(): any; additionalTitle?(): any }>();
</script>

<style scoped lang="scss">
.atc-popup {
    display: flex;
    flex-direction: column;
    gap: 0;

    &-container {
        cursor: initial;

        z-index: 20;

        width: max-content;
        max-width: 450px;
        padding: 5px 0;

        &--small {
            max-width: min(450px, 100%);
        }

        &--absolute {
            position: absolute;
        }

        @include mobileOnly {
            max-width: 100%;
        }
    }

    &_list {
        overflow: auto;
        display: flex;
        flex-direction: column;
        max-height: v-bind(maxHeight);
    }
}
</style>
