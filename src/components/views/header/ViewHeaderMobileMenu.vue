<template>
    <transition name="mobile-menu--appear">
        <div
            v-if="model"
            class="mobile-menu"
        >
            <div class="mobile-menu__menu">
                <template
                    v-for="button in headerMenu.filter(x => !x.disabled)"
                    :key="button.text"
                >
                    <common-button
                        class="mobile-menu__menu_item"
                        :class="{ 'mobile-menu__menu_item--active': openedMenu === button.text }"
                        :disabled="button.disabled"
                        text-align="left"
                        :to="button.children ? undefined : button.path"
                        :type="button.active ? 'primary' : 'secondary'"
                        @click="((button.path || button.action) && !button.children) ? [model = false, button.action?.()] : openedMenu = openedMenu === button.text ? null : button.text"
                    >
                        <template
                            v-if="button.icon"
                            #icon
                        >
                            <component :is="button.icon"/>
                        </template>

                        <div class="mobile-menu__menu_item_content">
                            <div class="mobile-menu__menu_item_content_text">
                                {{ button.text }}
                            </div>
                            <div
                                v-if="button.children"
                                class="mobile-menu__menu_item_content_arrow"
                            >
                                <arrow-top-icon/>
                            </div>
                        </div>
                    </common-button>
                    <div
                        v-if="openedMenu === button.text && button.children"
                        class="mobile-menu__menu mobile-menu__menu--children"
                    >
                        <common-button
                            v-for="childrenButton in button.children"
                            :key="childrenButton.text"
                            class="mobile-menu__menu_item mobile-menu__menu_item--children"
                            :disabled="childrenButton.disabled"
                            text-align="left"
                            :to="childrenButton.path"
                            :type="childrenButton.active ? 'primary' : 'secondary'"
                            @click="[model = false, childrenButton.action?.()]"
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
                </template>
            </div>
            <div class="__spacer"/>
            <div class="mobile-menu__links">
                <view-header-theme-switcher/>
                <common-button
                    href="https://github.com/VATSIM-Radar/vatsim-radar"
                    target="_blank"
                    type="secondary"
                >
                    <template #icon>
                        <github-icon/>
                    </template>
                </common-button>
                <common-button
                    href="https://docs.vatsim-radar.com"
                    target="_blank"
                    type="secondary"
                >
                    <template #icon>
                        <question-icon/>
                    </template>
                </common-button>
                <common-button
                    v-if="config.public.IS_DOWN !== 'true'"
                    type="secondary"
                    @click="[!store.user ? store.loginPopup = true : store.settingsPopup = true, model = false]"
                >
                    <template #icon>
                        <settings-icon/>
                    </template>
                </common-button>
                <common-button
                    v-if="app.$pwa && !app.$pwa?.isPWAInstalled && app.$pwa?.showInstallPrompt"
                    type="secondary"
                    @click="app.$pwa?.install()"
                >
                    <template #icon>
                        <load-on-pc-icon/>
                    </template>
                </common-button>
                <common-button-group mobile-horizontal>
                    <common-button
                        href="https://discord.com/invite/vatsim"
                        orientation="horizontal"
                        target="_blank"
                        type="secondary-875"
                    >
                        <template #icon>
                            <discord-icon/>
                        </template>
                        General VATSIM Discord
                    </common-button>
                    <common-button
                        href="/discord"
                        orientation="horizontal"
                        target="_blank"
                        type="secondary"
                    >
                        <template #icon>
                            <discord-icon/>
                        </template>
                        VATSIM Radar Development
                    </common-button>
                </common-button-group>
                <common-airac/>
            </div>
            <div class="mobile-menu__stats">
                <div
                    v-for="[title, counter] in counters"
                    :key="title"
                    class="mobile-menu__stats_item"
                >
                    <div class="mobile-menu__stats_item_title">
                        {{ title }}
                    </div>
                    <div class="mobile-menu__stats_item_text">
                        {{ counter }}
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { useHeaderMenu, useOnlineCounters } from '~/composables/navigation';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import ViewHeaderThemeSwitcher from '~/components/views/header/ViewHeaderThemeSwitcher.vue';
import DiscordIcon from 'assets/icons/header/discord.svg?component';
import GithubIcon from 'assets/icons/header/github.svg?component';
import SettingsIcon from 'assets/icons/kit/settings.svg?component';
import { useStore } from '~/store';
import CommonAirac from '~/components/common/vatsim/CommonAirac.vue';
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import QuestionIcon from 'assets/icons/basic/question.svg?component';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import LoadOnPcIcon from '~/assets/icons/kit/load-on-pc.svg?component';

const model = defineModel({ type: Boolean, required: true });

const app = useNuxtApp();
const onlineCounters = useOnlineCounters();
const store = useStore();
const headerMenu = useHeaderMenu();
const config = useRuntimeConfig();
const openedMenu = ref<string | null>(headerMenu.value.find(x => !x.disabled && x.active)?.text ?? null);

const counters = computed(() => ([
    ['Connections', onlineCounters.value.total],
    ['In VATSIM Radar', onlineCounters.value.inRadar],
    ['Pilots', onlineCounters.value.pilots],
    ['ATC', onlineCounters.value.firs + onlineCounters.value.atc],
    ['Supervisors', onlineCounters.value.sups],
    ['Admins', onlineCounters.value.adm],
    ['Last updated', onlineCounters.value.lastUpdated],
] satisfies [string, unknown][]).filter(x => x[1]));
</script>

<style scoped lang="scss">
.mobile-menu {
    scrollbar-gutter: stable;

    position: fixed;
    z-index: 50;
    top: 56px;
    left: 7px;

    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;

    width: calc(100% - 14px);
    height: calc(100% - 56px);
    padding: 16px;
    border-radius: 16px 16px 0 0;

    background: $darkgray950;

    &__flex-start {
        align-self: flex-start;
    }

    &--appear {
        &-enter-active,
        &-leave-active {
            transition: 0.3s;
        }

        &-enter-from,
        &-leave-to {
            top: 36px;
            opacity: 0;
        }
    }

    &__stats {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12px;

        @include tablet {
            font-size: 14px;
        }

        &_item {
            display: flex;
            gap: 4px;
            justify-content: space-between;

            padding: 8px;
            border-radius: 8px;

            background: $darkgray900;

            @include tablet {
                padding: 12px;
            }

            &_title {
                font-weight: 600;
            }
        }
    }

    &__menu {
        display: flex;
        flex-direction: column;
        gap: 8px;

        @include tablet {
            display: grid;
            grid-template-columns: repeat(2, calc(50% - 8px));
        }

        &--children {
            margin-left: 16px;
        }

        &_item {
            &_content {
                display: flex;
                gap: 8px;
                align-items: center;

                &_arrow {
                    transform: rotate(180deg);
                    width: 12px;
                    min-width: 12px;
                    transition: 0.3s;
                }
            }

            &--active .mobile-menu__menu_item_content_arrow {
                transform: rotate(0deg);
            }
        }
    }

    &__links {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
    }
}
</style>
