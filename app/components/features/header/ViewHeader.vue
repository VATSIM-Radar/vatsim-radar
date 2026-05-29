<template>
    <header class="header">
        <div class="header_left">
            <nuxt-link
                class="header__logo"
                no-prefetch
                to="/"
            >
                <branding-logo/>
            </nuxt-link>
            <div
                v-if="store.viewport.width > 1000"
                class="header__sections"
            >
                <div class="header__sections_section header__buttons">
                    <div
                        v-for="button in headerMenu"
                        :key="button.text"
                        class="header__buttons_btn"
                        :class="{ 'header__buttons_btn--has-children': button.children }"
                        :style="{ '--header-btn-width': button.width }"
                    >
                        <ui-text
                            class="header__btn"
                            :class="{
                                'header__btn--disabled': button.disabled,
                                'header__btn--active': button.active,
                            }"
                            :to="button.path"
                            type="2b"
                            @click="button.action?.()"
                        >
                            <div
                                v-if="button.icon"
                                class="header__btn_icon"
                            >
                                <component :is="button.icon"/>
                            </div>
                            <div
                                v-if="!isMobileOrTablet || button.children?.length"
                                class="header__btn_content"
                            >
                                <div class="header__btn_content_text">
                                    {{ button.text }}
                                </div>
                                <div
                                    v-if="button.children"
                                    class="header__btn_content_children"
                                >
                                    <arrow-top-icon class="header__btn_content_icon"/>
                                </div>
                            </div>
                        </ui-text>
                        <div
                            v-if="button.children"
                            class="header__buttons_btn_children_menu"
                        >
                            <ui-menu
                                item-padding="16px"
                                :items="button.children.map(x => ({ title: x.text, key: x.text, onClick: () => x.action ? x.action() : x.path ? $router.push(x.path) : undefined, item: x }))"
                            >
                                <template #default="{ item: { item } }">
                                    <ui-text
                                        class="header__buttons__children"
                                        :class="{
                                            'header__buttons__children--disabled': item.disabled,
                                            'header__buttons__children--active': item.active,
                                        }"
                                        :to="item.path"
                                        type="2b"
                                    >
                                        <div
                                            v-if="item.icon"
                                            class="header__buttons__children_icon"
                                        >
                                            <component :is="item.icon"/>
                                        </div>

                                        <div class="header__buttons__children_text">
                                            {{ item.text }}
                                        </div>
                                    </ui-text>
                                </template>
                            </ui-menu>
                        </div>
                    </div>
                </div>
                <div
                    v-if="route.path === '/' && !isMobileOrTablet"
                    class="header__sections_section"
                >
                    <view-header-search/>
                </div>
            </div>
        </div>
        <div class="header_right header__sections">
            <div
                v-if="!isMobileOrTablet"
                class="header__sections_section"
            >
                <view-header-theme-switcher/>
            </div>
            <div
                v-else-if="route.path === '/'"
                class="header__sections_section"
            >
                <ui-button
                    size="S"
                    :type="store.searchActive ? 'primary' : 'secondary'"
                    @click="store.searchActive = !store.searchActive"
                >
                    <template #icon>
                        <search-icon/>
                    </template>
                </ui-button>
                <ui-button
                    v-if="store.friends.length || store.bookmarks.length"
                    class="header__friends"
                    size="S"
                    :type="store.menuFriendsOpen ? 'primary' : 'secondary'"
                    @click="store.menuFriendsOpen = !store.menuFriendsOpen"
                >
                    <template #icon>
                        <star-filled-icon/>

                        <ui-bubble
                            class="header__friends-bubble"
                            :type="!store.friends.length ? 'secondary' : 'primary'"
                        >
                            {{ store.friends.length }}
                        </ui-bubble>
                    </template>
                </ui-button>
            </div>
            <div
                v-if="config.public.IS_DOWN !== 'true' && (store.user || !isIframe)"
                class="header__sections_section"
            >
                <ui-button
                    v-if="!store.user && !isIframe"
                    size="S"
                    @click="vatsimAuth"
                >
                    <template v-if="isMobile">
                        Login
                    </template>
                    <template v-else>
                        Connect VATSIM
                    </template>
                </ui-button>
                <div
                    v-else-if="store.user"
                    class="header__user"
                >
                    {{ headerName || store.user.fullName?.split(' ')?.[0] || 'Logged In' }}
                </div>
            </div>
            <div
                v-if="!isMobileOrTablet"
                class="header__sections_section"
            >
                <ui-button
                    href="https://github.com/VATSIM-Radar/vatsim-radar"
                    size="S"
                    target="_blank"
                    type="secondary"
                >
                    <template #icon>
                        <github-icon/>
                    </template>
                </ui-button>
                <ui-button
                    href="https://docs.vatsim-radar.com"
                    size="S"
                    target="_blank"
                    type="secondary"
                >
                    <template #icon>
                        <docs-icon/>
                    </template>
                </ui-button>
                <ui-tooltip
                    v-if="app.$pwa && !app.$pwa?.isPWAInstalled && app.$pwa?.showInstallPrompt"
                    location="bottom"
                    width="max-content"
                >
                    <template #activator>
                        <ui-button
                            size="S"
                            type="secondary"
                            @click="app.$pwa?.install()"
                        >
                            <template #icon>
                                <load-on-pc-icon/>
                            </template>
                        </ui-button>
                    </template>
                    Install App
                </ui-tooltip>
                <ui-tooltip
                    align="left"
                    location="left"
                    width="200px"
                >
                    <template #activator>
                        <ui-button
                            size="S"
                            type="secondary"
                        >
                            <template #icon>
                                <discord-icon/>
                            </template>
                        </ui-button>
                    </template>
                    <div class="__info-sections">
                        <ui-button
                            href="https://discord.com/invite/vatsim"
                            target="_blank"
                        >
                            General VATSIM Discussion
                        </ui-button>
                        <ui-button
                            href="/discord"
                            target="_blank"
                        >
                            VATSIM Radar Development
                        </ui-button>
                    </div>
                </ui-tooltip>
                <ui-button
                    v-if="config.public.IS_DOWN !== 'true'"
                    size="S"
                    :type="!store.settingsPopup ? 'secondary' : 'primary'"
                    @click="!store.user ? store.loginPopup = true : store.settingsPopup = !store.settingsPopup"
                >
                    <template #icon>
                        <settings-icon/>
                    </template>
                </ui-button>
            </div>
            <div
                v-if="isMobileOrTablet"
                class="header__sections_section"
            >
                <ui-button
                    size="S"
                    type="secondary"
                    @click="mobileMenuOpened = !mobileMenuOpened"
                >
                    <template #icon>
                        <ui-burger v-model="mobileMenuOpened"/>
                    </template>
                </ui-button>
                <view-header-mobile-menu v-model="mobileMenuOpened"/>
            </div>

            <view-header-settings v-model="store.settingsPopup"/>
        </div>
        <view-header-popups/>
        <transition name="header--mobile-search">
            <view-header-search v-if="isMobileOrTablet && store.searchActive"/>
        </transition>
    </header>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import DiscordIcon from 'assets/icons/header/discord.svg?component';
import GithubIcon from 'assets/icons/header/github.svg?component';
import SettingsIcon from 'assets/icons/kit/settings.svg?component';
import DocsIcon from 'assets/icons/basic/docs.svg?component';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import SearchIcon from 'assets/icons/kit/search.svg?component';
import BrandingLogo from '~/components/ui/BrandingLogo.vue';
import ViewHeaderSearch from '~/components/features/header/ViewHeaderSearch.vue';
import ViewHeaderSettings from '~/components/features/header/ViewHeaderSettings.vue';
import ViewHeaderPopups from '~/components/features/header/ViewHeaderPopups.vue';
import { useHeaderMenu } from '~/composables/map';
import ViewHeaderMobileMenu from '~/components/features/header/ViewHeaderMobileMenu.vue';
import ViewHeaderThemeSwitcher from '~/components/features/header/ViewHeaderThemeSwitcher.vue';
import StarFilledIcon from '~/assets/icons/kit/star-filled.svg?component';
import UiBubble from '~/components/ui/data/UiBubble.vue';
import LoadOnPcIcon from '~/assets/icons/kit/load-on-pc.svg?component';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import { isIframe } from '~/composables';
import UiText from '~/components/ui/text/UiText.vue';
import UiMenu from '~/components/ui/data/UiMenu.vue';
import { vatsimAuth } from '../../../composables/vatsim/auth';
import UiBurger from '~/components/ui/buttons/UiBurger.vue';

const headerMenu = useHeaderMenu();

const route = useRoute();
const store = useStore();
const headerName = useSettingValueFromFunc('appearance.headerName');
const config = useRuntimeConfig();

const app = useNuxtApp();

const isMobileOrTablet = useIsMobileOrTablet();
const isMobile = useIsMobile();

const mobileMenuOpened = ref(false);
</script>

<style scoped lang="scss">
.header {
    position: sticky;
    z-index: 10;
    top: 0;

    display: flex;
    align-items: stretch;
    justify-content: space-between;

    height: 56px;
    padding: 0 8px;

    color: $typographyPrimary;

    background: $black;

    &_left {
        display: flex;
        gap: 40px;
        align-items: center;
        margin-right: 32px;

        .header__sections {
            align-self: stretch;
        }
    }

    &_right {
        position: relative;
        z-index: 7;
    }

    &__logo {
        text-decoration: none;
    }

    &__user {
        font-size: 14px;
        font-weight: 700;
        color: $primary500;
    }

    &__sections {
        display: flex;
        gap: 16px;

        @include tablet {
            gap: 12px;
        }

        @include mobileOnly {
            gap: 8px;
        }

        &_section {
            display: flex;
            gap: 16px;
            align-items: center;

            @include tablet {
                gap: 12px;
            }

            @include mobileOnly {
                gap: 8px;
            }

            @include mobile {
                .search {
                    display: none !important;
                }
            }

            & + & {
                position: relative;
                padding-left: 16px;

                @include tablet {
                    padding-left: 12px;
                }

                @include mobileOnly {
                    padding-left: 8px;
                }

                &::before {
                    content: '';

                    position: absolute;
                    top: calc(50% - 12px);
                    left: 0;

                    height: 24px;
                    border-left: 1px solid varToRgba('lightGray500', 0.2);
                }
            }
        }
    }

    &__buttons {
        gap: 0 !important;
        align-self: stretch;

        :deep(.menu_item:not(:hover)) {
            background: $black;
        }

        .header__btn {
            cursor: default;

            position: relative;

            display: flex;
            gap: 12px;
            align-items: center;

            height: 100%;
            padding: 8px 16px;

            &::after {
                content: '';

                position: absolute;
                bottom: 2px;
                left: 0;

                width: 100%;
                height: 0;

                background: $blue500;

                transition: 0.3s;
            }

            &:is(a) {
                cursor: pointer;
            }

            &_icon {
                svg {
                    height: 16px;
                }
            }

            &_content {
                display: flex;
                flex-grow: 1;
                gap: 16px;
                align-items: center;
                justify-content: space-between;

                &_children {
                    svg {
                        transform-origin: center;
                        transform: rotate(90deg);
                        width: 8px;
                        transition: 0.3s;
                    }
                }
            }

            &--disabled {
                pointer-events: none;
                cursor: default;
                opacity: 0.2;
            }

            &--active::after {
                height: 2px;
            }
        }

        &__children {
            display: flex;
            gap: 8px;
            align-items: center;

            &_icon {
                width: 16px;
                min-width: 16px;
            }

            &--disabled {
                pointer-events: none;
                cursor: default;
                opacity: 0.2;
            }

            &--active {
                color: $blue500;
            }
        }

        &_btn {
            position: relative;
            align-self: stretch;
            width: var(--header-btn-width);
            transition: 0.3s;

            &--has-children {
                &:hover {
                    background: $darkGray900;

                    .header__buttons_btn_children_menu {
                        visibility: visible;
                        opacity: 1;
                    }

                    .header__btn_content_children svg {
                        transform: rotate(180deg);
                    }
                }
            }

            &_children {
                &_menu {
                    position: absolute;
                    z-index: 10;
                    top: calc(100% - 4px);
                    left: 0;

                    width: 100%;
                    border: 1px solid $whiteAlpha4;
                    border-top: 2px solid $strokeDefault;
                    border-radius: 0 0 4px 4px;

                    visibility: hidden;
                    opacity: 0;
                    background: $black;

                    transition: 0.3s;
                }
            }
        }
    }

    &--mobile-search {
        &-enter-active,
        &-leave-active {
            transition: 0.3s;
        }

        &-enter-from,
        &-leave-to {
            top: calc(100% - 10px);
            opacity: 0;
        }
    }

    &__friends {
        position: relative;

        &-bubble {
            position: absolute;
            top: -5px;
            right: -5px;
            min-width: unset !important;
        }
    }
}
</style>
