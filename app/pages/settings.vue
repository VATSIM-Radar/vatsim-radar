<template>
    <ui-page-container>
        <template #title>
            Settings
        </template>
        <template #description>
            Manage your experience here
        </template>
        <template #append>
            <ui-input-text
                v-model="search"
                placeholder="Search"
                width="448px"
                @appendClick="$event.input?.focus()"
            >
                <template #append>
                    <search-icon width="16"/>
                </template>
            </ui-input-text>
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
                            real-offset
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
                <nuxt-page
                    :item="currentItem"
                    @jumped="search = ''"
                />
            </div>

            <div class="settings_contents settings_menu">
                <div
                    v-if="currentItem?.items.filter(x => x.title).length && !search"
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
                        <!-- Model is incorrect for a reason -->
                        <ui-tabs
                            background="darkGray900"
                            :model-value="route.hash"
                            :tabs="Object.fromEntries(currentItem.items.filter(x => x.title).map(x => ([x.key, ({ title: x.title!, to: `#${ x.key }` })])))"
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
import { getSettingsSections } from '~/composables/settings/v2/sections';
import UiIcon from '~/components/ui/data/UiIcon.vue';
import UiText from '~/components/ui/text/UiText.vue';
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import UiTabs from '~/components/ui/data/UiTabs.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import SearchIcon from '@/assets/icons/kit/search.svg?component';
import type { SettingsItem, SettingsSectionBlock } from '~/composables/settings/v2/types';

const search = ref('');
const route = useRoute();

const rootPath = computed(() => route.params.path?.[0] ?? null);
const childrenPath = computed(() => route.params.path?.[1] ?? null);

const collapsedSettings = useCookie<string[]>('collapsed-settings', { default: () => ([]) });

const settingsSections = getSettingsSections();

const currentItem = computed(() => {
    if (search.value) {
        const block: SettingsSectionBlock = {
            title: 'Search results',
            description: 'Nothing has been found... Try again?',
            key: 'search',
            items: [],
        };

        const item: SettingsSection = {
            title: 'Search',
            url: '/search',
            items: [block],
        };

        const searchLowercase = search.value.toLowerCase();

        const foundBlocks: { item: SettingsItem; fullPath: string; score: number }[] = [];

        for (const root of settingsSections) {
            for (const section of root.sections) {
                for (const item of section.items) {
                    for (const component of item.items) {
                      if(component.disabled !== undefined && toValue(component.disabled)) continue
                        const match = {
                            item: component,
                            score: 0,
                        };

                        const words: string[] = [];

                        if ('title' in component) {
                            words.push(component.title.toLowerCase());
                            if (component.description) words.push(component.description.toLowerCase());
                            if (component.hint) words.push(component.hint.toLowerCase());
                        }

                        if (component.searchKeywords?.length) words.push(...component.searchKeywords.map(x => x.toLowerCase()));

                        for (const word of words) {
                            if (word === searchLowercase) {
                                match.score = 3;
                                break;
                            }
                            else if (word.startsWith(searchLowercase)) {
                                if (match.score < 2) match.score = 2;
                                else if (word.includes(searchLowercase)) if (match.score < 1) match.score = 1;
                            }
                        }

                        if (match.score > 0 && !foundBlocks.some(x => x.item === component)) foundBlocks.push({ item: component, fullPath: `/settings/${ root.url }/${ section.url }#${ item.key }`, score: match.score });
                    }
                }
            }
        }

        if (foundBlocks.length) block.description = `Found ${ foundBlocks.length } result${ foundBlocks.length > 1 ? 's' : '' }`;
        block.items = foundBlocks.sort((a, b) => b.score - a.score).map(x => ({
            ...x.item,
            fullPath: x.fullPath,
        }));

        return item;
    }

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
    // eslint-disable-next-line vue/no-ref-object-reactivity-loss
    if (!rootPath.value) {
        navigateTo(`/settings/${ settingsSections[0].url }`, { replace: true });
    }
    else {
        showError({ status: 404 });
    }
}
</script>

<style scoped lang="scss">
.settings {
    display: grid;
    grid-template-columns: (220px + 24px) calc(100% - 48px - 440px) 220px;
    flex-grow: 1;
    justify-content: space-between;

    &_menu {
        position: sticky;
        top: 56px;

        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 24px;
        align-self: stretch;

        width: calc(100%);
        max-height: calc(100dvh - 56px);
        padding: 16px 0;

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
