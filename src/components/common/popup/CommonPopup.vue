<template>
    <teleport
        v-if="modelValue"
        :disabled="disableTeleport"
        to="body"
    >
        <transition name="popup--appear">
            <div
                v-if="localValue"
                class="popup"
            >
                <div
                    class="popup_background"
                    @click.prevent.stop="closePopup()"
                />
                <div
                    class="popup_container"
                    @click.stop
                >
                    <div
                        class="popup__close"
                        @click="closePopup()"
                    >
                        <close-icon/>
                    </div>
                    <common-popup-block>
                        <template
                            v-if="$slots.title"
                            #title
                        >
                            <div class="popup__title">
                                <slot name="title"/>
                            </div>
                        </template>
                        <div
                            v-if="$slots.default"
                            class="popup__content"
                        >
                            <slot/>
                        </div>
                        <div
                            v-if="$slots.actions"
                            class="popup__actions"
                        >
                            <slot name="actions"/>
                        </div>
                    </common-popup-block>
                </div>
            </div>
        </transition>
    </teleport>
</template>

<script setup lang="ts">
import { sleep } from '~/utils';
import CloseIcon from 'assets/icons/basic/close.svg?component';
import CommonPopupBlock from '~/components/common/popup/CommonPopupBlock.vue';

const props = defineProps({
    disableTeleport: {
        type: Boolean,
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{ default(): any; title(): any; actions(): any }>();

const model = defineModel({
    type: Boolean,
    default: false,
});
const app = useNuxtApp();

// eslint-disable-next-line vue/no-ref-object-reactivity-loss
const localValue = ref(app.isHydrating ? model.value : false);

async function closePopup(pause = true) {
    if (props.disabled) return;
    if (pause) {
        localValue.value = false;
        await sleep(300);
    }
    model.value = false;
}

useHead({
    htmlAttrs: {
        class: {
            'no-overflow': localValue,
        },
    },
});

watch(model, async () => {
    if (import.meta.client && !app.isHydrating) {
        await nextTick();
    }
    localValue.value = model.value;
}, {
    immediate: true,
});

function handlePageKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closePopup();
}

onMounted(() => {
    document.addEventListener('keydown', handlePageKeydown);
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', handlePageKeydown);
});
</script>

<style scoped lang="scss">
.popup {
    z-index: 100;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    width: 100dvw;
    height: 100dvh;

    font-size: 16px;
    font-weight: normal;
    font-style: normal;
    line-height: 125%;
    text-align: left;

    @include mobile {
        overflow-y: visible;
    }

    &--appear {
        &-enter-active >, &-leave-active > {
            .popup_container {
                z-index: 100;
                transform: scale(1);
            }

            .popup_container, .popup_background {
                opacity: 1;
                transition: 0.3s;
            }
        }

        &-enter-from >, &-leave-to > {
            .popup_container {
                transform: scale(0.95);
            }

            .popup_container, .popup_background {
                opacity: 0;
            }
        }
    }

    &, &_background {
        position: fixed;
        top: 0;
        left: 0;
        transition: 0.3s;
    }

    &_background {
        cursor: pointer;

        width: 200dvw;
        height: 300dvh;

        background: varToRgba('neutral1000', 0.33);
        backdrop-filter: blur(5px);
    }

    &_container {
        position: relative;

        max-width: 700px;
        padding: 8px;

        background: $neutral1000;
        border-radius: 8px;
    }

    &__close {
        cursor: pointer;

        position: absolute;
        top: 16px;
        right: 16px;

        width: 16px;

        color: varToRgba('neutral150', 0.2);
    }

    & &__title {
        font-size: 20px;
    }

    &__content {
        margin-top: 8px;
    }

    &__actions {
        display: flex;
        gap: 8px;

        :deep(>*) {
            flex: 1 1 0;
            width: 0;
        }

        &:not(:first-child) {
            margin-top: 8px;
        }
    }
}
</style>
