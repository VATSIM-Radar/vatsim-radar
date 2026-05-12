<template>
    <div class="settings-page">
        <div
            v-for="(section) in item.items"
            :key="section.key"
            class="settings-page_section"
            :data-section-id="section.key"
        >
            <ui-text
                v-if="section.title"
                :to="`#${ section.key }`"
                type="h4"
            >
                {{section.title}}
            </ui-text>
            <ui-text
                v-if="section.description"
                color="lightGray900"
                type="2b"
            >
                {{section.description}}
            </ui-text>
            <div
                v-for="(sectionItem, index) in section.items"
                :key="index"
                class="settings-page__item"
                :class="[
                    `settings-page__item--type-${ sectionItem.type }`, {
                        'settings-page__item--has-left': 'title' in sectionItem ,
                        'settings-page__item--disabled': toValue(sectionItem.disabled),
                    },
                ]"
            >
                <div
                    v-if="'title' in sectionItem"
                    class="settings-page__item_left"
                >
                    <ui-text
                        class="settings-page__item_left_title"
                        type="2b-medium"
                        @click="labelClick"
                    >
                        <span>
                            {{sectionItem.title}}
                        </span>
                        <ui-tooltip
                            v-if="sectionItem.hint"
                            location="right"
                        >
                            {{sectionItem.hint}}
                        </ui-tooltip>
                    </ui-text>
                    <ui-text
                        v-if="sectionItem.description"
                        class="settings-page__item_left_description"
                        color="lightGray900"
                        type="3b"
                    >
                        {{sectionItem.description}}
                    </ui-text>
                    <ui-button
                        v-if="sectionItem.fullPath"
                        class="settings-page__item_left_path"
                        link-color="blue500"
                        :to="sectionItem.fullPath"
                        type="link"
                        @click="emit('jumped')"
                    >
                        Jump to component
                    </ui-button>
                </div>
                <div class="settings-page__item_component">
                    <settings-component :item="sectionItem"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import UiText from '~/components/ui/text/UiText.vue';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import SettingsComponent from '~/components/features/settings/v2/components/SettingsComponent.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';

const props = defineProps({
    item: {
        type: Object as PropType<SettingsSection>,
        required: true,
    },
});

const emit = defineEmits({
    jumped() {
        return true;
    },
});

const route = useRoute();

watch(() => route.hash, val => {
    const item = document.querySelector(`[data-section-id="${ val.slice(1) }"]`);
    if (item) {
        window.scrollBy({
            behavior: 'smooth',
            top: item.getBoundingClientRect().top - 56 - 16,
        });
    }
});

function labelClick(event: MouseEvent) {
    const component = (event.target as HTMLDivElement).closest('.settings-page__item')!.querySelector('.settings-page__item_component > *');

    if (component) {
        const input = component.querySelector<HTMLInputElement>('input:not(:disabled)');

        if (input) input.focus();
        else if ('click' in component) (component as HTMLDivElement).click();
    }
}

useHead({
    title: computed(() => props.item.title),
});
</script>

<style scoped lang="scss">
.settings-page {
    display: flex;
    flex-direction: column;
    gap: 40px;
    padding: 0 40px;

    &_section {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    &__item {
        &_left {
            display: flex;
            flex-direction: column;
            gap: 8px;

            &_title {
                cursor: pointer;
                display: flex;
                gap: 8px;
                align-items: center;
            }
        }

        &--has-left {
            display: grid;
            grid-template-columns: 31% calc(100% - 31% - 24px);
            justify-content: space-between;
        }
    }
}
</style>
