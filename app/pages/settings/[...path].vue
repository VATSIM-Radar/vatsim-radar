<template>
    <div v-if="item" class="settings-page">
        <div
            v-for="(section) in item.items.filter(x => x.hide === undefined || !toValue(x.hide))"
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
            <ui-setting-display
                v-for="(sectionItem, index) in section.items"
                :key="index"
                class="settings-page__item"
                :class="[`settings-page__item--type-${ sectionItem.type }`]"
                :disabled="toValue(sectionItem.disabled)"
            >
                <template
                    v-if="'title' in sectionItem"
                    #title
                >
                    {{sectionItem.title}}
                </template>
                <template
                    v-if="'hint' in sectionItem"
                    #hint
                >
                    {{sectionItem.hint}}
                </template>
                <template
                    v-if="'description' in sectionItem"
                    #description
                >
                    {{sectionItem.description}}
                </template>
                <template
                    v-if="sectionItem.fullPath"
                    #leftAppend
                >
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
                </template>
                <div class="__vertical-group-16">
                    <settings-component :item="sectionItem"/>
                    <component :is="sectionItem.appendComponent" v-if="'appendComponent' in sectionItem"/>
                </div>
            </ui-setting-display>
        </div>
    </div>
</template>

<script setup lang="ts">
import UiText from '~/components/ui/text/UiText.vue';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import SettingsComponent from '~/components/features/settings/v2/components/SettingsComponent.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiSettingDisplay from '~/components/ui/data/UiSettingDisplay.vue';

const props = defineProps({
    item: {
        type: Object as PropType<SettingsSection | null>,
        required: true,
    },
});

const emit = defineEmits({
    jumped() {
        return true;
    },
});

definePageMeta({
    pageTransition: { name: 'page', mode: 'out-in' },
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

useHead({
    title: computed(() => props.item?.title),
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
}
</style>

<style>
.page-enter-active,
.page-leave-active {
    transition: all 0.15s ease-out;
}

.page-enter-from,
.page-leave-to {
    opacity: 0;
}
</style>
