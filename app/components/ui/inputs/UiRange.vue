<template>
    <div
        class="range"
        :class="{ 'range--zero': percentFilled <= 0 }"
        :style="{ '--percent': percentFilled }"
    >
        <ui-text
            v-if="$slots.default"
            class="range_text"
            type="2b-medium"
        >
            <slot/>
        </ui-text>
        <div class="range_slider">
            <ui-text
                v-if="!hideLabels"
                class="range_slider_label range_slider_label--left"
                type="3b"
            >
                {{minLabel ?? min}}
            </ui-text>
            <div class="range_slider_input-container"  @wheel.prevent="handleWheel">
                <input
                    v-model="model"
                    class="range_slider_input"
                    :disabled
                    :max="max"
                    :min="min"
                    :step="step"
                    type="range"
                    @wheel.stop.prevent="handleWheel"
                >
            </div>
            <ui-text
                v-if="!hideLabels"
                class="range_slider_label range_slider_label--right"
                type="3b"
            >
                {{maxLabel ?? max}}
            </ui-text>
            <ui-input-number
                v-if="showInput"
                v-model="model"
                class="range_slider_number"
                :input-attrs="{ min, max }"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import UiText from '~/components/ui/text/UiText.vue';
import UiInputNumber from '~/components/ui/inputs/UiInputNumber.vue';

const props = defineProps({
    min: {
        type: Number,
        required: true,
    },
    max: {
        type: Number,
        required: true,
    },
    hideLabels: {
        type: Boolean,
        default: false,
    },
    minLabel: {
        type: String,
    },
    maxLabel: {
        type: String,
    },
    showInput: {
        type: Boolean,
        default: false,
    },
    step: {
        type: Number,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    timeDiff: {
        type: Number,
        default: 40,
    },
    width: {
        type: String,
    },
});

defineSlots<{ default?(): any }>();
const model = defineModel<number>({ type: Number, required: true });
const percentFilled = computed(() => {
    const value = (model.value - props.min) / (props.max - props.min);
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
});
let lastScrollTime = 0;

function handleWheel(e: WheelEvent) {
    const now = Date.now();
    const timeDiff = now - lastScrollTime;
    lastScrollTime = now;

    let stepMultiplier = 1;
    if (timeDiff < props.timeDiff) stepMultiplier = 5;

    const delta = e.deltaY > 0 ? -1 : 1;
    const change = delta * 5 * stepMultiplier;

    model.value = Math.min(props.max, Math.max(props.min, +(model.value ?? '0') + change));
}
</script>

<style scoped lang="scss">
.range {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &_slider {
        display: flex;
        gap: 16px;
        align-items: center;

        &_input {
            @mixin thumb {
                position: relative;
                z-index: 2;

                width: 12px;
                height: 12px;
                margin-left: -2px;
                border: none;
                border-radius: 9999px;

                appearance: none;
                background: transparent;
                outline: none;
            }

            overflow: hidden;

            width: 100%;
            height: 16px;
            margin: 0;
            padding: 0;
            border: none;
            border-radius: 9999px;

            appearance: none;
            background: $backgroundLevel2;
            outline: none;

            &::-webkit-slider-runnable-track {
                position: relative;
                z-index: 3;

                height: 12px;

                color: transparent;

                appearance: none;
            }

            &::-webkit-slider-thumb {
                @include thumb;
            }

            &::-moz-range-thumb {
                @include thumb;
            }

            &::-moz-range-progress {
                background-color: transparent;
            }

            &-container {
                position: relative;
                flex-grow: 1;
                height: 16px;

                &::before {
                    content: '';

                    position: absolute;
                    z-index: 0;
                    inset: 0;

                    width: calc(var(--percent) * (100% - 12px) + 12px + 2px);
                    height: 100%;
                    border-radius: 9999px;

                    background: $brandPrimary;

                    @at-root .range--zero & {
                        z-index: 2;
                    }
                }

                &::after {
                    content: '';

                    position: absolute;
                    z-index: 1;
                    top: 2px;
                    left: calc(var(--percent) * (100% - 12px));

                    width: 12px;
                    height: 12px;
                    border-radius: 100%;

                    background: $backgroundLevel1;
                }
            }
        }

        &_number {
            width: 60px;
            min-width: 60px;
        }
    }
}
</style>
