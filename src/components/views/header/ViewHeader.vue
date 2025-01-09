<template>
    <div
        v-if="false && !notamCookie"
        class="header-error header-error--notam"
    >
        <div class="header-error_text">
            VATSIM Radar will undergo maintenance on August 11th at 14:00z with expected downtime of 5-10 minutes, during which online services may be temporally unavailable. Thank you for your patience.
        </div>
        <div
            class="header-error_close"
            @click="[notamCookie=true]"
        >
            <close-icon/>
        </div>
    </div>
    <header class="header">
        <div class="header_left">
            <nuxt-link
                class="header__logo"
                no-prefetch
                to="/"
            >
                <common-logo/>
            </nuxt-link>
            <div class="header__sections __from-tablet">
                <div class="header__sections_section header__buttons">
                    <common-button
                        v-for="button in headerMenu"
                        :key="button.text"
                        class="header__buttons_btn-container"
                        :class="{ 'header__buttons_btn-container--has-children': button.children }"
                        :disabled="button.disabled"
                        :to="button.path"
                        :type="button.active ? 'primary' : 'secondary'"
                        :width="button.width"
                        @click="button.action?.()"
                    >
                        <template
                            v-if="button.icon"
                            #icon
                        >
                            <component :is="button.icon"/>
                        </template>
                        <template
                            v-if="!isMobileOrTablet || button.children?.length"
                            #default
                        >
                            <div class="header__buttons_btn">
                                <div class="header__buttons_btn_text">
                                    {{ button.text }}
                                </div>
                                <div
                                    v-if="button.children"
                                    class="header__buttons_btn_children"
                                >
                                    <arrow-top-icon class="header__buttons_btn_children_icon"/>
                                    <div class="header__buttons_btn_children_menu">
                                        <common-button
                                            v-for="childrenButton in button.children"
                                            :key="childrenButton.text"
                                            :disabled="childrenButton.disabled"
                                            :to="childrenButton.path"
                                            :type="childrenButton.active ? 'primary' : 'secondary'"
                                            @click="childrenButton.action?.()"
                                        >
                                            <template
                                                v-if="childrenButton.icon"
                                                #icon
                                            >
                                                <component :is="childrenButton.icon"/>
                                            </template>

                                            {{ childrenButton.text }}
                                        </common-button>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </common-button>
                </div>
                <div
                    v-if="route.path === '/' && !isMobileOrTablet"
                    class="header__sections_section"
                >
                    <view-search/>
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
                <common-button
                    size="S"
                    :type="store.searchActive ? 'primary' : 'secondary'"
                    @click="store.searchActive = !store.searchActive"
                >
                    <template #icon>
                        <search-icon/>
                    </template>
                </common-button>
                <common-button
                    v-if="store.friends.length || store.bookmarks.length"
                    class="header__friends"
                    size="S"
                    :type="store.menuFriendsOpen ? 'primary' : 'secondary'"
                    @click="store.menuFriendsOpen = !store.menuFriendsOpen"
                >
                    <template #icon>
                        <star-filled-icon/>

                        <common-bubble
                            class="header__friends-bubble"
                            :type="!store.friends.length ? 'secondary' : 'primary'"
                        >
                            {{ store.friends.length }}
                        </common-bubble>
                    </template>
                </common-button>
            </div>
            <div
                v-if="config.public.IS_DOWN !== 'true'"
                class="header__sections_section"
            >
                <common-button
                    v-if="!store.user"
                    href="/api/auth/vatsim/redirect"
                    size="S"
                >
                    <template v-if="isMobile">
                        Login
                    </template>
                    <template v-else>
                        Connect VATSIM
                    </template>
                </common-button>
                <div
                    v-else
                    class="header__user"
                >
                    {{ store.user.settings.headerName || store.user.fullName.split(' ')[0] }}
                </div>
            </div>
            <div
                v-if="!isMobileOrTablet"
                class="header__sections_section"
            >
                <common-button
                    href="https://github.com/VATSIM-Radar/vatsim-radar"
                    size="S"
                    target="_blank"
                    type="secondary"
                >
                    <template #icon>
                        <github-icon/>
                    </template>
                </common-button>
                <common-button
                    href="/discord"
                    size="S"
                    target="_blank"
                    type="secondary"
                >
                    <template #icon>
                        <discord-icon/>
                    </template>
                </common-button>
                <common-button
                    v-if="config.public.IS_DOWN !== 'true'"
                    size="S"
                    :type="!store.settingsPopup ? 'secondary' : 'primary'"
                    @click="!store.user ? store.loginPopup = true : store.settingsPopup = !store.settingsPopup"
                >
                    <template #icon>
                        <settings-icon/>
                    </template>
                </common-button>
            </div>
            <div
                v-if="isMobileOrTablet"
                class="header__sections_section"
            >
                <common-button
                    size="S"
                    type="secondary"
                    @click="mobileMenuOpened = !mobileMenuOpened"
                >
                    <template #icon>
                        <div
                            class="header__burger"
                            :class="{ 'header__burger--active': mobileMenuOpened }"
                        >
                            <div
                                v-for="i in 3"
                                :key="i"
                                class="header__burger_item"
                                :class="[`header__burger_item--${ i }`]"
                            />
                        </div>
                    </template>
                </common-button>
                <view-header-mobile-menu v-model="mobileMenuOpened"/>
            </div>

            <view-header-settings v-model="store.settingsPopup"/>
        </div>
        <view-header-popups/>
        <transition name="header--mobile-search">
            <view-search v-if="isMobileOrTablet && store.searchActive"/>
        </transition>
    </header>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import DiscordIcon from 'assets/icons/header/discord.svg?component';
import GithubIcon from 'assets/icons/header/github.svg?component';
import SettingsIcon from 'assets/icons/kit/settings.svg?component';
import CloseIcon from 'assets/icons/basic/close.svg?component';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import SearchIcon from 'assets/icons/kit/search.svg?component';
import CommonLogo from '~/components/common/basic/CommonLogo.vue';
import ViewSearch from '~/components/views/search/ViewSearch.vue';
import ViewHeaderSettings from '~/components/views/header/ViewHeaderSettings.vue';
import ViewHeaderPopups from '~/components/views/header/ViewHeaderPopups.vue';
import { useHeaderMenu } from '~/composables/navigation';
import ViewHeaderMobileMenu from '~/components/views/header/ViewHeaderMobileMenu.vue';
import ViewHeaderThemeSwitcher from '~/components/views/header/ViewHeaderThemeSwitcher.vue';
import StarFilledIcon from '@/assets/icons/kit/star-filled.svg?component';
import CommonBubble from '~/components/common/basic/CommonBubble.vue';

const headerMenu = useHeaderMenu();

const route = useRoute();
const store = useStore();
const config = useRuntimeConfig();
const notamCookie = useCookie<boolean>('notam-closed', {
    path: '/',
    sameSite: 'strict',
    secure: true,
    maxAge: 60 * 60 * 24,
});

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
    align-items: center;
    justify-content: space-between;

    height: 56px;
    padding: 8px 24px;

    background: $darkgray1000;

    &-error {
        position: relative;

        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: space-between;

        margin: 0 24px;
        padding: 8px 16px;
        border-radius: 0 0 8px 8px;

        font-size: 12px;
        color: $lightgray150Orig;

        background: $error500;

        &--notam {
            background: $primary600;

            &::before {
                content: 'NOTAM';

                position: absolute;
                right: 40px;

                font-size: 15px;
                font-weight: 700;
                letter-spacing: 2px;
            }
        }

        &_close {
            cursor: pointer;
            width: 16px;
            min-width: 16px;
            transition: 0.3s;

            @include hover {
                &:hover {
                    color: $lightgray50Orig;
                }
            }
        }
    }

    &_left {
        display: flex;
        gap: 32px;
        align-items: center;
    }

    &_right {
        position: relative;
        z-index: 7;
    }

    &__logo {
        text-decoration: none;
    }

    &__user {
        font-family: $openSansFont;
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
                    border-left: 1px solid varToRgba('lightgray150', 0.2);
                }
            }
        }
    }


    &__buttons {
        &_btn {
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: space-between;

            width: 100%;

            text-align: left;

            &-container {
                position: relative;

                &--has-children {
                    &:hover {
                        border-bottom-right-radius: 0 !important;
                        border-bottom-left-radius: 0 !important;
                        background: $darkgray875 !important;

                        .header__buttons_btn_children_menu {
                            visibility: visible;
                            opacity: 1;
                        }

                        .header__buttons_btn_children_icon {
                            transform: rotate(0deg);
                        }
                    }
                }
            }

            &_children {
                &_icon {
                    transform: rotate(180deg);
                    width: 12px;
                    transition: 0.3s;
                }

                &_menu {
                    position: absolute;
                    z-index: 10;
                    top: calc(100% - 1px);
                    left: 0;

                    display: flex;
                    flex-direction: column;
                    gap: 8px;

                    width: 100%;
                    padding: 8px;
                    border-bottom-right-radius: 8px;
                    border-bottom-left-radius: 8px;

                    visibility: hidden;
                    opacity: 0;
                    background: $darkgray1000;

                    transition: 0.3s;
                }
            }
        }
    }

    &__burger {
        position: relative;

        display: flex;
        flex-direction: column;
        gap: 2px;
        align-items: center;

        &_item {
            width: 12px;
            height: 2px;
            border-radius: 4px;

            background: $lightgray100;

            transition: 0.3s;
        }

        &--active {
            .header__burger_item-- {
                &1 {
                    transform: translateY(4px) rotate(45deg);
                }

                &2 {
                    width: 0;
                }

                &3 {
                    transform: translateY(-4px) rotate(-45deg);
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
