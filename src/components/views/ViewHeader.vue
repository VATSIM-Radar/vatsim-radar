<template>
    <div
        v-if="(store.localSettings.filters?.layers?.layer === 'Jawg' || (store.localSettings.filters?.layers?.layer === 'JawgOrOSM' && store.theme === 'default')) && !warningClosed"
        class="header-error"
    >
        <div class="header-error_text">
            VATSIM Radar has exceeded it's quota for Jawg map layer. Functionality will be restored on, or shortly after, 10 July. For now, we have replaced this layer with Carto.
        </div>
        <div
            class="header-error_close"
            @click="[warningCookie=true, warningClosed=true]"
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
                <logo-icon class="header__logo_icon"/>
                <div class="header__logo_text">
                    VATSIM<br>
                    Radar
                </div>
            </nuxt-link>
            <div class="header__sections">
                <div class="header__sections_section header__buttons">
                    <common-button
                        v-for="button in buttons"
                        :key="button.text"
                        :disabled="button.disabled"
                        :href="button.href"
                        :target="button.href && '_blank'"
                        :to="button.path"
                        :type="button.path === route.path ? 'primary' : 'secondary'"
                    >
                        <template
                            v-if="button.icon"
                            #icon
                        >
                            <component :is="button.icon"/>
                        </template>
                        {{ button.text }}
                    </common-button>
                </div>
            </div>
        </div>
        <div class="header_right header__sections">
            <div class="header__sections_section">
                <div
                    class="header__theme"
                    :class="[`header__theme--${ store.theme ?? 'default' }`]"
                >
                    <div
                        class="header__theme_item header__theme_item--dark"
                        @click="[theme = 'default', store.theme = theme]"
                    >
                        <dark-theme/>
                    </div>
                    <div
                        class="header__theme_item header__theme_item--light"
                        @click="[theme = 'light', store.theme = theme]"
                    >
                        <light-theme/>
                    </div>
                </div>
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
                    Connect VATSIM
                </common-button>
                <div
                    v-else
                    class="header__user"
                >
                    {{ settings.headerName || store.user.fullName.split(' ')[0] }}
                </div>
            </div>
            <div
                class="header__sections_section"
            >
                <common-button
                    href="https://github.com/daniluk4000/vatsim-radar"
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
                    :type="!settingsPopup ? 'secondary' : 'primary'"
                    @click="!store.user ? loginPopup = true : settingsPopup = !settingsPopup"
                >
                    <template #icon>
                        <settings-icon/>
                    </template>
                </common-button>
            </div>

            <common-info-popup
                v-model="settingsPopup"
                absolute
                class="header__settings"
                :sections="[
                    { title: 'VATSIM Account', key: 'account' },
                    { title: 'Navigraph Account', key: 'navigraph' },
                    { title: 'Preferences', key: 'follow' },
                ]"
            >
                <template #title>
                    Settings
                </template>
                <template #account>
                    <div class="header__settings__block header__settings__block--short-gap">
                        <common-info-block>
                            <template #top>
                                <div class="header__settings__two-col-block">
                                    <div class="header__settings__two-col-block_title">
                                        VATSIM ID
                                    </div>
                                    <div class="header__settings__two-col-block_text">
                                        {{ store.user!.cid }}
                                    </div>
                                </div>
                            </template>
                        </common-info-block>
                        <common-info-block>
                            <template #top>
                                <div class="header__settings__two-col-block">
                                    <div class="header__settings__two-col-block_title">
                                        Header Name<br>

                                        <small>
                                            Customize shown header name.
                                            Leave blank for defaults.
                                        </small>
                                    </div>
                                    <div class="header__settings__two-col-block_text">
                                        <common-input-text
                                            :model-value="settings.headerName ?? ''"
                                            placeholder="Enter name"
                                            @change="settings.headerName = ($event.target as HTMLInputElement).value"
                                        />
                                    </div>
                                </div>
                            </template>
                        </common-info-block>
                        <common-button-group>
                            <common-button
                                :href="`https://stats.vatsim.net/stats/${ store.user!.cid }`"
                                target="_blank"
                            >
                                My stats
                            </common-button>
                            <common-button
                                class="header__settings__logout"
                                href="/api/user/logout"
                            >
                                Logout
                            </common-button>
                        </common-button-group>
                        <common-button
                            class="header__settings__delete"
                            type="link"
                            @click="deletePopup = true"
                        >
                            Delete Account
                        </common-button>
                    </div>
                </template>
                <template #follow>
                    <div class="header__settings__block header__settings__block--long-gap">
                        <common-toggle v-model="settings.autoFollow">
                            Auto-follow me

                            <template #description>
                                Enabling this will auto-open info popup with your current flight and
                                enable tracking of it (on map load or when spawned on ground)
                            </template>
                        </common-toggle>
                        <common-toggle
                            v-model="settings.autoZoom"
                            :disabled="!settings.autoFollow"
                        >
                            Auto-zoom to me

                            <template #description>
                                Enabling this will also zoom to your aicraft position (differs from
                                ground to airborne) on initial spawn/site open<br><br>
                                By default it will use last saved position
                            </template>
                        </common-toggle>
                        <common-toggle v-model="settings.toggleAircraftOverlays">
                            Fast open multiple aircraft

                            <template #description>
                                By default, you have to pin aircraft overlay to keep it open - it will close otherwise. With this setting, it will stay open, and others will open minified.
                            </template>
                        </common-toggle>
                        <common-toggle v-model="settings.autoShowAirportTracks">
                            Auto-show airport tracks

                            <template #description>
                                Enabling this will auto-show aircraft arrival tracks for any airport overlay you open.
                            </template>
                        </common-toggle>
                    </div>
                </template>
                <template #navigraph>
                    <div class="header__settings__block header__settings__block--long-gap">
                        <common-button
                            v-if="store.user?.hasFms === null"
                            href="/api/auth/navigraph/redirect"
                        >
                            Link Navigraph
                        </common-button>
                        <div
                            v-else
                            class="header__settings__navigraph"
                            :class="{ 'header__settings__navigraph--unlimited': store.user!.hasFms }"
                        >
                            <div class="header__settings__navigraph_title">
                                Status
                            </div>
                            <div class="header__settings__navigraph_status">
                                <template v-if="store.user!.hasCharts">
                                    Unlimited
                                </template>
                                <template v-else-if="store.user!.hasFms">
                                    Navigraph Data
                                </template>
                                <template v-else>
                                    Standard
                                </template>
                            </div>
                            <common-button
                                class="header__settings__navigraph_unlink"
                                type="link"
                                @click="deleteNavigraphPopup = true"
                            >
                                Unlink
                            </common-button>
                        </div>
                        <div class="header__settings__description">
                            Users with linked Navigraph and Unlimited/Data subscription will receive latest AIRAC for
                            gates, waypoints and all
                            other Navigraph-related stuff
                        </div>
                    </div>
                </template>
            </common-info-popup>
        </div>
        <common-popup v-model="loginPopup">
            <template #title>
                Authorize via VATSIM
            </template>
            In order to edit and save your settings, you must authorize first.
            <template #actions>
                <common-button
                    type="secondary"
                    @click="loginPopup = false"
                >
                    Stand by
                </common-button>
                <common-button href="/api/auth/vatsim/redirect">
                    Wilco
                </common-button>
            </template>
        </common-popup>
        <common-popup v-model="deletePopup">
            <template #title>
                Account Deletion
            </template>
            Are you completely sure you want to delete your account?<br><br>
            <strong>You will not be able to cancel this action</strong>. All your VATSIM Radar information and
            preferences will be permanently lost.
            <template #actions>
                <common-button
                    type="secondary"
                    @click="deleteAccount"
                >
                    Permanently delete account
                </common-button>
                <common-button @click="deletePopup = false">
                    Cancel that please
                </common-button>
            </template>
        </common-popup>
        <common-popup v-model="deleteNavigraphPopup">
            <template #title>
                Navigraph Account Unlink
            </template>
            Are you sure you want to unlink your Navigraph account?<br><br>
            Well, you can always link that again later anyway.
            <template #actions>
                <common-button
                    type="secondary"
                    @click="deleteNavigraphAccount"
                >
                    Unlink Navigraph account
                </common-button>
                <common-button @click="deleteNavigraphPopup = false">
                    Nah, I'm good
                </common-button>
            </template>
        </common-popup>
    </header>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import { defu } from 'defu';
import type { UserSettings } from '~/utils/backend/user';
import DiscordIcon from '@/assets/icons/header/discord.svg?component';
import GithubIcon from '@/assets/icons/header/github.svg?component';
import SettingsIcon from '@/assets/icons/kit/settings.svg?component';
import LogoIcon from '@/assets/icons/basic/logo.svg?component';
import RadarIcon from '@/assets/icons/kit/radar.svg?component';
import MapIcon from '@/assets/icons/kit/map.svg?component';
import DataIcon from '@/assets/icons/kit/data.svg?component';
import EventsIcon from '@/assets/icons/kit/event.svg?component';
import DarkTheme from '@/assets/icons/header/dark-theme.svg?component';
import LightTheme from '@/assets/icons/header/light-theme.svg?component';
import PathIcon from '@/assets/icons/kit/path.svg?component';
import CloseIcon from '@/assets/icons/basic/close.svg?component';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonPopup from '~/components/common/popup/CommonPopup.vue';
import CommonInfoPopup from '~/components/common/popup/CommonInfoPopup.vue';

import type { ThemesList } from '~/utils/backend/styles';

const route = useRoute();
const store = useStore();
const config = useRuntimeConfig();
const warningCookie = useCookie<boolean>('warning-closed', {
    path: '/',
    sameSite: 'strict',
    secure: true,
    maxAge: 60 * 60 * 24 * 7,
});
const warningClosed = ref(warningCookie.value);

const buttons = computed(() => {
    return [
        {
            text: 'Map',
            path: '/',
            icon: MapIcon,
        },
        {
            text: 'Events',
            disabled: true,
            icon: EventsIcon,
        },
        {
            text: 'Stats',
            disabled: true,
            icon: DataIcon,
        },
        {
            text: 'Roadmap',
            path: '/roadmap',
            icon: PathIcon,
        },
        {
            text: 'Patreon',
            href: 'https://www.patreon.com/vatsimradar24',
            icon: RadarIcon,
        },
    ];
});

const theme = useCookie<ThemesList>('theme', {
    path: '/',
    sameSite: 'strict',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
});

const loginPopup = ref(false);
const settingsPopup = ref(false);
const deletePopup = ref(false);
const deleteNavigraphPopup = ref(false);

const settings = reactive(defu<UserSettings, [UserSettings]>(store.user?.settings ?? {}, {
    autoFollow: false,
    autoZoom: false,
}));

const deleteAccount = async () => {
    await $fetch('/api/user/delete', {
        method: 'POST',
    });
    location.reload();
};

const deleteNavigraphAccount = async () => {
    await $fetch('/api/user/unlink-navigraph', {
        method: 'POST',
    });
    store.user!.hasFms = null;
    deleteNavigraphPopup.value = false;
};

watch(settings, () => {
    $fetch('/api/user/settings', {
        method: 'POST',
        body: settings,
    });
    store.user!.settings = settings;
});

onMounted(() => {
    if (!theme.value) {
        if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
            theme.value = 'light';
        }
        else {
            theme.value = 'default';
        }

        store.theme = theme.value;
    }
});
</script>

<style scoped lang="scss">
.header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    height: 56px;
    padding: 8px 24px;

    &-error {
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: space-between;

        padding: 10px;

        font-size: 12px;
        color: $lightgray150Orig;

        background: $error500;
        border-radius: 0 0 10px 10px;

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
        user-select: none;

        display: flex;
        gap: 8px;
        align-items: center;

        font-size: 12px;
        font-weight: 700;
        color: $lightgray50;
        text-decoration: none;

        &_icon {
            width: 40px;
            color: $lightgray100;

            :deep(> rect) {
                color: $primary500;
            }

            :deep(.wifi) {
                color: $darkgray950;
            }
        }
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

        &_section {
            display: flex;
            gap: 16px;
            align-items: center;

            & + & {
                padding-left: 16px;
                border-left: 1px solid varToRgba('lightgray150', 0.2);
            }
        }
    }

    &__settings {
        top: calc(100% + 24px);
        right: -4px;

        &__block {
            display: flex;
            flex-direction: column;

            &--short-gap {
                gap: 8px;
            }

            &--long-gap {
                gap: 16px;
            }
        }

        &__two-col-block {
            display: grid;
            grid-template-columns: repeat(2, 45%);
            justify-content: space-between;

            &_text {
                font-weight: normal;
            }
        }

        & :is(&__logout, &__delete):not(:hover, :focus, :active) {
            color: $error500;
        }

        & &__delete {
            justify-content: center;
        }

        &__description {
            font-size: 12px;
        }

        &__navigraph {
            display: flex;
            gap: 4px;
            align-items: center;
            justify-content: space-between;

            font-size: 13px;
            font-weight: 600;
            color: $lightgray150;

            &--unlimited .header__settings__navigraph_status {
                color: $success500;
            }
        }
    }

    &__theme {
        position: relative;

        display: grid;
        grid-template-columns: repeat(2, 45px);

        height: 32px;

        color: $lightgray150;

        background: $darkgray900;
        border-radius: 8px;

        &::before {
            content: '';

            position: absolute;
            top: 0;
            left: 0;

            width: 45px;
            height: 100%;

            background: $primary500;
            border-radius: 8px;

            transition: 0.5s ease-in-out;
        }

        &_item {
            cursor: pointer;

            position: relative;

            display: flex;
            align-items: center;
            justify-content: center;

            transition: 0.5s ease-in-out;

            svg {
                width: 15px;

                :deep(path) {
                    transition: fill 0.5s ease-in-out;
                }
            }
        }

        &--light {
            &::before {
                left: 45px;
            }

            .header__theme_item--light {
                @keyframes lightColorChange {
                    0% {
                        color: $darkgray900Orig;
                    }

                    100% {
                        color: $darkgray900;
                    }
                }

                & {
                    transform: rotate(-90deg);
                    color: $darkgray900;
                    animation: lightColorChange 0.5s ease-in-out;
                }
            }

            .header__theme_item--dark :deep(path) {
                fill: transparent;
            }
        }

        @at-root .header__theme--light .header__theme_item--light {
            cursor: default;
        }

        @at-root .header__theme--default .header__theme_item--dark {
            cursor: default;
        }
    }
}
</style>
