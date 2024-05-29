<template>
    <div class="header-error" v-if="config.public.IS_DOWN === 'true' && !warningClosed">
        <div class="header-error_text">
            Website database is currently experiencing network issues. Login and own aircraft tracking are not possible at the
            moment. We plan to restore everything before the end of the week. Our apologies for this outage, and we will ensure this
            won't happen again in future.
        </div>
        <div class="header-error_close" @click="[warningCookie=true, warningClosed=true]">
            <close-icon/>
        </div>
    </div>
    <header class="header">
        <div class="header_left">
            <nuxt-link no-prefetch to="/" class="header__logo">
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
                        :type="button.path === route.path ? 'primary' : 'secondary'"
                        :disabled="button.disabled"
                        :to="button.path"
                    >
                        <template #icon v-if="button.icon">
                            <component :is="button.icon"/>
                        </template>
                        {{ button.text }}
                    </common-button>
                </div>
            </div>
        </div>
        <div class="header_right header__sections">
            <div class="header__sections_section">
                <div class="header__theme" :class="[`header__theme--${store.theme ?? 'default'}`]">
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
            <div class="header__sections_section" v-if="config.public.IS_DOWN !== 'true'">
                <common-button size="S" href="/auth/vatsim/redirect" v-if="!store.user">
                    Connect VATSIM
                </common-button>
                <div class="header__user" v-else>
                    {{ settings.headerName || store.user.fullName.split(' ')[0] }}
                </div>
            </div>
            <div class="header__sections_section">
                <common-button
                    size="S"
                    :type="!settingsPopup ? 'secondary' : 'primary'"
                    @click="!store.user ? loginPopup = true : settingsPopup = !settingsPopup"
                    v-if="config.public.IS_DOWN !== 'true'"
                >
                    <template #icon>
                        <settings-icon/>
                    </template>
                </common-button>
                <common-button size="S" href="/discord" target="_blank" type="secondary">
                    <template #icon>
                        <discord-icon/>
                    </template>
                </common-button>
            </div>

            <common-info-popup
                class="header__settings"
                absolute
                v-model="settingsPopup"
                :sections="[
                    {title: 'VATSIM Account', key: 'account'},
                    {title: 'Navigraph Account', key: 'navigraph'},
                    {title: 'Preferences', key: 'follow'},
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
                                            placeholder="Enter name"
                                            :model-value="settings.headerName ?? ''"
                                            @change="settings.headerName = ($event.target as HTMLInputElement).value"
                                        />
                                    </div>
                                </div>
                            </template>
                        </common-info-block>
                        <common-button-group>
                            <common-button :href="`https://stats.vatsim.net/stats/${store.user!.cid}`" target="_blank">
                                My stats
                            </common-button>
                            <common-button class="header__settings__logout" href="/user/logout">
                                Logout
                            </common-button>
                        </common-button-group>
                        <common-button class="header__settings__delete" type="link" @click="deletePopup = true">
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
                        <common-toggle v-model="settings.autoZoom" :disabled="!settings.autoFollow">
                            Auto-zoom to me

                            <template #description>
                                Enabling this will also zoom to your aicraft position (differs from
                                ground to airborne) on initial spawn/site open<br><br>
                                By default it will use last saved position
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
                        <common-button v-if="store.user?.hasFms === null" href="/auth/navigraph/redirect">
                            Link Navigraph
                        </common-button>
                        <div
                            class="header__settings__navigraph"
                            :class="{'header__settings__navigraph--unlimited': store.user!.hasFms}"
                            v-else
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
                <common-button type="secondary" @click="loginPopup = false">
                    Stand by
                </common-button>
                <common-button href="/auth/vatsim/redirect">
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
                <common-button @click="deleteAccount" type="secondary">
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
                <common-button @click="deleteNavigraphAccount" type="secondary">
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
import SettingsIcon from '@/assets/icons/kit/settings.svg?component';
import LogoIcon from '@/assets/icons/basic/logo.svg?component';
import MapIcon from '@/assets/icons/kit/map.svg?component';
import DataIcon from '@/assets/icons/kit/data.svg?component';
import EventsIcon from '@/assets/icons/kit/event.svg?component';
import DarkTheme from '@/assets/icons/header/dark-theme.svg?component';
import LightTheme from '@/assets/icons/header/light-theme.svg?component';
import PathIcon from '@/assets/icons/kit/path.svg?component';
import CloseIcon from '@/assets/icons/basic/close.svg?component';
import type { ThemesList } from '~/modules/styles';

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
    ];
});

const theme = useCookie<ThemesList>('theme', {
    path: '/',
    sameSite: 'strict',
    secure: true,
    maxAge: 60 * 60 * 24 * 360,
});

store.theme = theme.value ?? 'default';

const loginPopup = ref(false);
const settingsPopup = ref(false);
const deletePopup = ref(false);
const deleteNavigraphPopup = ref(false);

const settings = reactive(defu<UserSettings, [UserSettings]>(store.user?.settings ?? {}, {
    autoFollow: false,
    autoZoom: false,
}));

const deleteAccount = async () => {
    await $fetch('/user/delete', {
        method: 'POST',
    });
    location.reload();
};

const deleteNavigraphAccount = async () => {
    await $fetch('/user/unlink-navigraph', {
        method: 'POST',
    });
    store.user!.hasFms = null;
    deleteNavigraphPopup.value = false;
};

watch(settings, () => {
    $fetch('/user/settings', {
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
    justify-content: space-between;
    align-items: center;
    height: 56px;
    padding: 8px 24px;

    &-error {
        background: $error500;
        color: $neutral150Orig;
        padding: 10px;
        font-size: 12px;
        border-radius: 0 0 10px 10px;
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: space-between;

        &_close {
            width: 16px;
            min-width: 16px;
            cursor: pointer;
            transition: 0.3s;

            @include hover {
                &:hover {
                    color: $neutral50Orig;
                }
            }
        }
    }

    &_left {
        display: flex;
        align-items: center;
        gap: 32px;
    }

    &_right {
        position: relative;
        z-index: 7;
    }

    &__logo {
        font-size: 12px;
        font-weight: 700;
        color: $neutral50;
        user-select: none;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 8px;

        &_icon {
            color: $neutral100;
            width: 40px;

            :deep(> rect) {
                color: $primary500;
            }

            :deep(.wifi) {
                color: $neutral950;
            }
        }
    }

    &__user {
        color: $primary500;
        font-size: 14px;
        font-family: $openSansFont;
        font-weight: 700;
    }

    &__sections {
        display: flex;
        gap: 16px;

        &_section {
            display: flex;
            align-items: center;
            gap: 16px;

            & + & {
                padding-left: 16px;
                border-left: 1px solid varToRgba('neutral150', 0.2);
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
            font-weight: 600;
            font-size: 13px;
            gap: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: $neutral150;

            &--unlimited .header__settings__navigraph_status {
                color: $success500;
            }
        }
    }

    &__theme {
        display: grid;
        height: 32px;
        grid-template-columns: repeat(2, 45px);
        border-radius: 8px;
        background: $neutral900;
        color: $neutral150;
        position: relative;

        &::before {
            content: '';
            position: absolute;
            width: 45px;
            height: 100%;
            background: $primary500;
            border-radius: 8px;
            transition: 0.5s ease-in-out;
            left: 0;
            top: 0;
        }

        &_item {
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            transition: 0.5s ease-in-out;
            position: relative;

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
                        color: $neutral900Orig;
                    }

                    100% {
                        color: $neutral900;
                    }
                }

                color: $neutral900;
                animation: lightColorChange 0.5s ease-in-out;
                transform: rotate(-90deg);
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
