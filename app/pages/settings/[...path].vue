<template>
    <div
        v-if="item"
        ref="root"
        class="settings-page"
    >
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

const root = useTemplateRef<HTMLDivElement>('root');

definePageMeta({
    pageTransition: { name: 'page', mode: 'out-in' },
});

const route = useRoute();
const sectionRef = useTemplateRef<HTMLDivElement[]>('sectionRef');
const isMobile = useIsMobileOrTablet();

function scrollToHash() {
    const scrollContainer = root.value?.parentElement;
    if (!scrollContainer) return;

    const hash = route.hash.slice(1);
    const item = hash ? sectionRef.value?.find(section => section.dataset.sectionId === hash) : null;

    if (item) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        scrollContainer.scrollTo({
            behavior: 'smooth',
            top: scrollContainer.scrollTop + itemRect.top - containerRect.top - 16,
        });
    }
    else {
        scrollContainer.scrollTo({
            top: 0,
        });
    }
}

function scrollPageToRoot() {
    if (!root.value || !isMobile.value) return;

    window.scrollTo({
        behavior: 'smooth',
        top: window.scrollY + root.value.getBoundingClientRect().top - 56 - 52 - 16,
    });
}

onMounted(() => {
    watch(() => route.hash, scrollToHash, {
        immediate: true,
    });

    watch(() => route.path, async () => {
        await nextTick();
        requestAnimationFrame(scrollPageToRoot);
    }, {
        immediate: true,
        flush: 'post',
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
    padding: 0 24px;

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
