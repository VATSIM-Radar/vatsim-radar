<template>
    <ui-page-container>
        <template #title>
            Settings
        </template>
        <template #description>
            Manage your experience here
        </template>
        <template #append>
            <div class="__horizontal-group-16">
                <ui-button :type="mapPreview ? 'primary' : 'secondary-black'" @click="mapPreview = !mapPreview">
                    Preview on Map
                </ui-button>
                <ui-input-text
                    v-model="search"
                    placeholder="Search"
                    :width="isMobile ? '100%' : '448px'"
                    @appendClick="$event.input?.focus()"
                >
                    <template #append>
                        <search-icon width="16"/>
                    </template>
                </ui-input-text>
            </div>
        </template>

        <div v-if="isHideMenu" class="settings-nav">
            <div class="settings-nav_menu">
                <ui-button
                    class="settings_contents-burger"
                    icon-width="12px"
                    size="S"
                    type="secondary"
                    @click="menuActive = !menuActive"
                >
                    <template #icon>
                        <ui-burger v-model="menuActive"/>
                    </template>

                    Menu
                </ui-button>
            </div>
            <div v-if="currentItem?.items.filter(x => x.title).length && !search" class="settings-nav_contents">
                <ui-button
                    class="settings_contents-burger"
                    icon-width="12px"
                    size="S"
                    type="secondary"
                    @click="contentsActive = !contentsActive"
                >
                    Contents
                </ui-button>
            </div>
        </div>

        <div class="settings" :class="{ 'settings--preview': mapPreview }">
            <div
                class="settings_menu settings_menu--nav"
                :class="{
                    'settings_menu--nav--hide': isHideMenu, 'settings_menu--nav--hidden': isHideMenu && !menuActive,
                }"
            >
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
                        @click="menuActive = false"
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
                            :model-value="String(rootPath) + (childrenPath ?? '')"
                            :tabs="Object.fromEntries(root.sections.map(x => ([root.url + x.url, ({ title: x.title, to: `/settings/${ root.url }/${ x.url }` })])))"
                            vertical
                            @update:modelValue="menuActive = false"
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

            <div
                v-if="!isHideContents || isMobileOrTablet"
                class="settings_contents settings_menu"
                :class="{ 'settings_contents--hide': isHideContents, 'settings_contents--hidden': isHideContents && !contentsActive }"
            >
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
                            @update:modelValue="contentsActive = false"
                        />
                    </div>
                </div>
            </div>

            <iframe
                v-if="mapPreview"
                ref="iframe"
                class="settings_iframe"
                src="/?preset=settings"
            />
            <div
                v-if="mapPreview && isMobileOrTablet"
                class="settings_iframe_close"
                @click="mapPreview = false"
            >
                <close-icon/>
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
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiBurger from '~/components/ui/buttons/UiBurger.vue';
import CloseIcon from 'assets/icons/basic/close.svg?component';

const store = useStore();
const search = ref('');
const route = useRoute();
const iframe = useTemplateRef('iframe');

const isMobile = useIsMobile();
const isMobileOrTablet = useIsMobileOrTablet();

const menuActive = ref(false);
const isHideMenu = computed(() => {
    return store.viewport.width < 1280;
});

const contentsActive = ref(false);
const isHideContents = computed(() => {
    return isHideMenu.value || (mapPreview.value && store.viewport.width < 2000);
});

const rootPath = computed(() => route.params.path?.[0] ?? null);
const childrenPath = computed(() => route.params.path?.[1] ?? null);

const collapsedSettings = useCookie<string[]>('collapsed-settings', { default: () => ([]) });

const settingsSections = getSettingsSections();
const mapPreview = useCookie<boolean>('map-preview', {
    sameSite: 'none',
    secure: true,
});

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
                        if ('title' in component && component.title.includes('Aircraft Display')) console.log(component);

                        if (component.disabled !== undefined && toValue(component.disabled)) continue;
                        if (component.hidden !== undefined && toValue(component.hidden)) continue;
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
                            }
                            else if (word.includes(searchLowercase)) if (match.score < 1) match.score = 1;
                        }

                        if ('title' in component && component.title.includes('Aircraft Display')) console.log(match, words, searchLowercase);

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
    /* header footer page-block-header gap */
    --max-height: calc(100dvh - 56px - 32px - 52px - 32px - var(--container-vertical-padding) * 2 - 2px);
    position: relative;

    display: flex;
    flex-grow: 1;
    gap: 8px;
    justify-content: space-between;

    @include mobile {
        --max-height: calc(100dvh - 56px - 32px - var(--container-vertical-padding) * 2 - 2px);
    }

    &_iframe {
        overflow: hidden;

        width: 35%;
        min-width: 35%;
        height: var(--max-height);
        border: none;
        border-radius: 16px;

        @include mobile {
            position: fixed;
            z-index: 10;
            inset: 0;

            width: 100%;
            height: 100%;
        }

        &_close {
            position: fixed;
            z-index: 11;
            top: 16px;
            right: 16px;

            svg {
                width: 16px;
            }
        }
    }

    &_menu {
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 24px;
        align-self: stretch;

        width: 220px;
        min-width: calc(220px + 24px);
        max-height: var(--max-height);
        padding: 16px 0;

        &--nav {
            padding-right: 24px;
            border-right: 1px solid $whiteAlpha12;

            &--hide {
                position: absolute;
                z-index: 4;
                top: 0;
                left: 0;

                overflow: auto;

                width: 100%;
                min-width: unset;
                max-width: 220px;
                height: 100%;
                padding: 48px 8px 0;
                padding-top: 0;
                border-right: 1px solid $strokeDefault;

                white-space: nowrap;

                background: $darkGray900;

                &:not(.settings_menu--nav--hidden) {
                    transition: 0.3s;
                    transition-property: opacity, visibility;
                }
            }

            &--hidden {
                visibility: hidden;
                opacity: 0;
            }
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

    &_content {
        overflow: auto;
        flex-grow: 1;
        max-width: 820px;
        max-height: var(--max-height);
    }

    &_contents {
        width: 220px;
        min-width: 220px;

        &--hide {
            position: absolute;
            z-index: 2;
            top: 0;
            right: 0;

            overflow: hidden;

            width: 100%;
            min-width: unset;
            max-width: 220px;
            height: 100%;
            padding: 48px 8px 0;
            border-left: 1px solid $strokeDefault;

            white-space: nowrap;

            background: $darkGray900;

            &:not(.settings_contents--hidden) {
                transition: 0.3s;
                transition-property: opacity, visibility;
            }

            @include mobileOnly {
                max-width: unset;
                padding-top: 0;
                border-left: 0;
            }
        }

        &--hidden {
            visibility: hidden;
            opacity: 0;
        }
    }

    &-nav {
        position: sticky;
        z-index: 5;
        top: 56px;

        display: flex;
        gap: 8px;
        justify-content: space-between;

        margin: 0 calc(var(--container-horizontal-padding) * -1) 16px;
        padding: 8px 16px;
        border-bottom: 1px solid $strokeDefault;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;

        background: $darkGray900;
    }
}
</style>
