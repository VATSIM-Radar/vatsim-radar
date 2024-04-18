<template>
    <header class="header">
        <div class="header_left">
            <nuxt-link to="/" class="header__logo">
                Vatsim Radar
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
                            <component :is="button.icon" />
                        </template>
                        {{ button.text }}
                    </common-button>
                </div>
            </div>
        </div>
        <div class="header_right header__sections">
            <div class="header__sections_section">
                <common-button size="S" href="/auth/vatsim/redirect" v-if="!store.user">
                    Connect Vatsim
                </common-button>
                <div class="header__user" v-else>
                    {{ store.user.fullName }}
                </div>
            </div>
            <div class="header__sections_section">
                <common-button
                    size="S"
                    :type="!settingsPopup ? 'secondary' : 'primary'"
                    @click="!store.user ? loginPopup = true : settingsPopup = !settingsPopup"
                >
                    <template #icon>
                        <settings-icon/>
                    </template>
                </common-button>
                <common-button size="S" href="https://discord.gg/MtFKhMPePe" target="_blank" type="secondary">
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
                    {title: 'Vatsim Account', key: 'account'},
                    {title: 'Follow Me Preferences', key: 'follow', collapsible: true, collapsedDefault: true},
                    {title: 'Navigraph Account', key: 'navigraph'}
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
                                        Vatsim ID
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
                                        Name
                                    </div>
                                    <div class="header__settings__two-col-block_text">
                                        {{ store.user!.fullName }}
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
                        <div class="header__settings__description">
                            Those are placeholders that will have effect later, along with follow and pilot info popup features
                        </div>
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
                                Enabling this will also enable constant zoom to your aicraft position (differs from
                                ground to airborne)<br><br>
                                By default it will use last saved position
                            </template>
                        </common-toggle>
                    </div>
                </template>
                <template #navigraph>
                    <div class="header__settings__block header__settings__block--long-gap">
                        <common-button v-if="store.user?.hasFms === null" href="/auth/navigraph/redirect">
                            Link Navigraph
                        </common-button>
                        <div class="header__settings__navigraph" :class="{'header__settings__navigraph--unlimited': store.user!.hasFms}" v-else>
                            <div class="header__settings__navigraph_title">
                                Status
                            </div>
                            <div class="header__settings__navigraph_status">
                                <template v-if="store.user!.hasFms">
                                    Unlimited
                                </template>
                                <template v-else>
                                    Standard
                                </template>
                            </div>
                            <common-button class="header__settings__navigraph_unlink" type="link" @click="deleteNavigraphPopup = true">
                                Unlink
                            </common-button>
                        </div>
                        <div class="header__settings__description">
                            Users with linked Navigraph Unlimited will receive latest AIRAC for gates, waypoints and all other Navigraph-related stuff
                        </div>
                    </div>
                </template>
            </common-info-popup>
        </div>
        <common-popup v-model="loginPopup">
            <template #title>
                Authorize via Vatsim
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
            <strong>You will not be able to cancel this action</strong>. All your Vatsim Radar information and preferences will be permanently lost.
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
import MapIcon from '@/assets/icons/kit/map.svg?component';
import DataIcon from '@/assets/icons/kit/data.svg?component';
import EventsIcon from '@/assets/icons/kit/event.svg?component';
import PathIcon from '@/assets/icons/kit/path.svg?component';

const route = useRoute();
const store = useStore();

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
});
</script>

<style scoped lang="scss">
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 56px;
    padding: 8px 24px;

    &_left {
        display: flex;
        align-items: center;
        gap: 32px;
    }

    &_right {
        position: relative;
        z-index: 5;
    }

    &__logo {
        font-size: 31px;
        font-weight: 700;
        font-family: $openSansFont;
        color: $primary500;
        user-select: none;
        text-decoration: none;
    }

    &__user {
        color: $primary500;
        font-size: 14px;
        font-family: $openSansFont;
        font-weight: 700;
    }

    &__sections {
        display: flex;
        align-items: center;
        gap: 16px;

        &_section {
            display: flex;
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
}
</style>
