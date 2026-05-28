<template>
    <div v-if="item" class="settings-page">
        <client-only>
            <div
                v-for="(section) in item.items.filter(x => x.hide === undefined || !toValue(x.hide))"
                :key="section.key"
                ref="sectionRef"
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
                <ui-setting-item
                    v-for="(sectionItem, index) in section.items.filter(x => !x.hidden || !toValue(x.hidden))"
                    :key="section.key + index"
                    :item="sectionItem"
                    @jumped="emit('jumped')"
                />
            </div>
        </client-only>
    </div>
</template>

<script setup lang="ts">
import UiText from '~/components/ui/text/UiText.vue';
import SettingsComponent from '~/components/features/settings/v2/components/SettingsComponent.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiSettingDisplay from '~/components/ui/data/UiSettingDisplay.vue';
import UiSettingItem from '~/components/ui/data/UiSettingItem.vue';

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
const sectionRef = useTemplateRef('sectionRef');

function scrollToHash() {
    const item = document.querySelector(`[data-section-id="${ route.hash.slice(1) }"]`);
    if (item) {
        window.scrollBy({
            behavior: 'smooth',
            top: item.getBoundingClientRect().top - 56 - 16,
        });
    }
}

onMounted(() => {
    watch(() => route.hash, scrollToHash, {
        immediate: true,
    });
});

watch(sectionRef, scrollToHash, {
    once: true,
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
