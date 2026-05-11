<template>
    <ui-page-container>
        <template #title>
            Settings
        </template>
        <template #description>
            Manage your experience here
        </template>
        <template #append>
            Search
        </template>

        <div class="settings">
            <div class="settings_menu settings_menu--nav">
                <div
                    v-for="root in settingsSections"
                    :key="root.url"
                    class="settings_menu_item settings_menu_item--root"
                    :class="{
                        'settings_menu_item--active': rootPath === root.url,
                        'settings_menu_item--collapsed': collapsedSettings.includes(root.url),
                    }"
                >
                    <ui-text
                        class="settings_menu_item_header"
                        :to="`/settings/${ root.url }`"
                        type="h5"
                    >
                        <ui-icon
                            v-if="root.icon"
                            class="settings_menu_item_header_icon"
                            color="whiteAlpha64"
                            :size="20"
                        >
                            <component :is="root.icon"/>
                        </ui-icon>
                        <div class="settings_menu_item_header_text">
                            {{root.title}}
                        </div>
                        <div class="__spacer"/>
                        <div
                            v-if="rootPath !== root.url"
                            class="settings_menu_item_header_collapse"
                            @click.prevent.stop="collapsedSettings.includes(root.url) ? collapsedSettings = collapsedSettings.filter(x => x !== root.url) : collapsedSettings = [...collapsedSettings, root.url]"
                        >
                            <arrow-top-icon/>
                        </div>
                    </ui-text>
                    <div
                        v-if="!collapsedSettings.includes(root.url) || rootPath === root.url"
                        class="settings_menu_item_children"
                    >
                        <ui-tabs
                            background="darkGray900"
                            :model-value="childrenPath"
                            :tabs="Object.fromEntries(root.sections.map(x => ([x.url, ({ title: x.title, to: `/settings/${ root.url }/${ x.url }` })])))"
                            vertical
                        />
                    </div>
                </div>
            </div>

            <div class="settings_content">
                <nuxt-page/>
            </div>

            <div class="settings_contents settings_menu">
                <div
                    v-if="currentItem?.items.filter(x => x.title).length"
                    class="settings_menu_item settings_menu_item--root"
                >
                    <ui-text
                        class="settings_menu_item_header"
                        type="h5"
                    >
                        <div class="settings_menu_item_header_text">
                            Contents
                        </div>
                    </ui-text>
                    <div class="settings_menu_item_children">
                        <ui-tabs
                            background="darkGray900"
                            :model-value="childrenPath"
                            :tabs="Object.fromEntries(currentItem.items.filter(x => x.title).map(x => ([x.title, ({ title: x.title })])))"
                            vertical
                        />
                    </div>
                </div>
            </div>
        </div>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import { settingsSections } from '~/composables/settings/v2/sections';
import UiIcon from '~/components/ui/data/UiIcon.vue';
import UiText from '~/components/ui/text/UiText.vue';
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import UiTabs from '~/components/ui/data/UiTabs.vue';

const route = useRoute();

const rootPath = computed(() => route.params.path?.[0] ?? null);
const childrenPath = computed(() => route.params.path?.[1] ?? null);

const collapsedSettings = useCookie<string[]>('collapsed-settings', { default: () => ([]) });

const currentItem = computed(() => {
    for (const root of settingsSections) {
        if (root.url !== rootPath.value) continue;

        for (const item of root.sections) {
            if (item.url !== childrenPath.value) {
                if (!item.url && !childrenPath.value) return item;

                continue;
            }
            return item;
        }
    }

    return null;
});

// eslint-disable-next-line vue/no-ref-object-reactivity-loss
if (!currentItem.value) {
    showError({ status: 404 });
}

useHead({
    title: computed(() => `${ currentItem.value?.title }`),
});
</script>

<style scoped lang="scss">
.settings {
    display: grid;
    grid-template-columns: (220px + 24px) calc(100% - 48px - 440px) 220px;
    justify-content: space-between;

    &_menu {
        position: sticky;
        top: 56px;

        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 24px;

        width: calc(100% + var(--container-horizontal-padding));
        max-height: calc(100dvh - 56px + var(--container-vertical-padding));
        margin-top: calc(var(--container-vertical-padding) * -1);
        margin-left: calc(var(--container-horizontal-padding) * -1);
        padding-top: var(--container-vertical-padding);
        padding-left: var(--container-horizontal-padding);

        &--nav {
            padding-right: 24px;
            border-right: 1px solid $whiteAlpha12;
        }

        &_item {
            display: block;

            &_header {
                display: flex;
                gap: 12px;
                align-items: center;
                transition: 0.3s;

                &_collapse {
                    will-change: transform;

                    transform-origin: center;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    width: 16px;
                    height: 16px;

                    color: $typographyPrimary;

                    transition: 0.3s;

                    @include hover {
                        &:hover {
                            color: $brandPrimary;
                        }
                    }

                    svg {
                        width: 8px;
                    }
                }


                @include hover {
                    @at-root &:is(a):hover {
                        color: $brandPrimaryStroke;
                    }
                }

                @at-root .settings_menu_item--active & {
                    .settings_menu_item_header_icon {
                        --color: #{$brandPrimary} !important;
                    }

                    .settings_menu_item_header_text {
                        color:   $brandPrimary;
                    }
                }
            }

            &--collapsed .settings_menu_item_header_collapse {
                transform: rotate(180deg);
            }

            &_children {
                margin-top: 8px;
            }
        }
    }
}
</style>
