<template>
    <teleport v-if="modelValue" :disabled="disableTeleport" to="body">
        <transition name="popup--appear">
            <div class="popup" v-if="localValue">
                <div class="popup_background" @click.prevent.stop="closePopup()"/>
                <div class="popup_container" @click.stop>
                    <div class="popup__close" @click="closePopup()">
                        <close-icon/>
                    </div>
                    <common-popup-block>
                        <template #title v-if="$slots.title">
                            <div class="popup__title">
                                <slot name="title"/>
                            </div>
                        </template>
                        <div class="popup__content" v-if="$slots.default">
                            <slot/>
                        </div>
                        <div class="popup__actions" v-if="$slots.actions">
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
import CloseIcon from 'assets/icons/close.svg?component';

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
    width: 100dvw;
    height: 100dvh;

    @include mobile {
        overflow-y: visible;
    }

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    font-size: 16px;
    font-weight: normal;
    font-style: normal;
    line-height: 125%;
    text-align: left;
    z-index: 100;

    &--appear {
        &-enter-active >, &-leave-active > {
            .popup_container {
                transform: scale(1);
                z-index: 100;
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
        width: 200dvw;
        height: 300dvh;
        cursor: pointer;
        background: varToRgba('neutral1000', 0.33);
        backdrop-filter: blur(5px);
    }

    &_container {
        background: $neutral1000;
        border-radius: 8px;
        padding: 8px;
        position: relative;
        max-width: 700px;
    }

    &__close {
        position: absolute;
        width: 16px;
        top: 16px;
        right: 16px;
        cursor: pointer;
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
            width: 100%;
        }

        &:not(:first-child) {
            margin-top: 8px;
        }
    }
}
</style>
