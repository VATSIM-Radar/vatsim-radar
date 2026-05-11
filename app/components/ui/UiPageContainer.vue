<template>
    <div class="page-block">
        <component
            :is="container ? UiContainer : 'div'"
            class="page-block_container"
        >
            <div
                v-if="$slots.title"
                class="page-block__header"
            >
                <div class="page-block__header_left">
                    <ui-text
                        v-if="$slots.title"
                        class="page-block__header__title"
                        type="h2"
                    >
                        <slot name="title"/>
                    </ui-text>
                    <ui-text
                        v-if="$slots.description"
                        class="page-block__header__description"
                        type="3b"
                    >
                        <slot name="description"/>
                    </ui-text>
                </div>
                <div
                    v-if="$slots.append"
                    class="page-block__header_right"
                >
                    <slot name="append"/>
                </div>
            </div>
            <slot/>
        </component>
    </div>
</template>

<script lang="ts" setup>
import UiContainer from '~/components/ui/UiContainer.vue';
import { Fragment } from 'vue';
import UiText from '~/components/ui/text/UiText.vue';

defineProps({
    container: {
        type: Boolean,
        default: false,
    },
});

defineSlots<{ default?: () => any; title?: () => any; description?: () => any; append?: () => any }>();
</script>

<style scoped lang="scss">
.page-block {
    --container-vertical-padding: 24px;
    --container-horizontal-padding: 24px;

    flex: 1 0 auto;

    width: 100%;
    padding: var(--container-vertical-padding) var(--container-horizontal-padding);
    border: 1px solid $strokeDefault;
    border-radius: 8px;

    background: $darkGray900;

    @include mobileOnly {
        --container-vertical-padding: 8px;
        --container-horizontal-padding: 8px;
    }

    &__header {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        justify-content: space-between;

        margin-bottom: 32px;

        &_left {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        & &__description {
            color: $typographySecondary;
        }
    }
}
</style>
