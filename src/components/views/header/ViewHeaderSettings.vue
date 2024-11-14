<template>
    <common-info-popup
        v-model="model"
        absolute
        class="settings"
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
            <div class="settings__block settings__block--short-gap">
                <common-info-block>
                    <template #top>
                        <div class="settings__two-col-block">
                            <div class="settings__two-col-block_title">
                                VATSIM ID
                            </div>
                            <div class="settings__two-col-block_text">
                                {{ store.user!.cid }}
                            </div>
                        </div>
                    </template>
                </common-info-block>
                <common-info-block>
                    <template #top>
                        <div class="settings__two-col-block">
                            <div class="settings__two-col-block_title">
                                Header Name<br>

                                <small>
                                    Customize shown header name.
                                    Leave blank for defaults.
                                </small>
                            </div>
                            <div class="settings__two-col-block_text">
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
                        class="settings__logout"
                        href="/api/user/logout"
                    >
                        Logout
                    </common-button>
                </common-button-group>
                <common-button
                    class="settings__delete"
                    type="link"
                    @click="store.deleteAccountPopup = true"
                >
                    Delete Account
                </common-button>
            </div>
        </template>
        <template #follow>
            <div class="settings__block settings__block--long-gap">
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
            <div class="settings__block settings__block--long-gap">
                <common-button
                    v-if="store.user?.hasFms === null"
                    href="/api/auth/navigraph/redirect"
                >
                    Link Navigraph
                </common-button>
                <div
                    v-else
                    class="settings__navigraph"
                    :class="{ 'settings__navigraph--unlimited': store.user!.hasFms }"
                >
                    <div class="settings__navigraph_title">
                        Status
                    </div>
                    <div class="settings__navigraph_status">
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
                        class="settings__navigraph_unlink"
                        type="link"
                        @click="store.deleteNavigraphPopup = true"
                    >
                        Unlink
                    </common-button>
                </div>
                <div class="settings__description">
                    Users with linked Navigraph and Unlimited/Data subscription will receive latest AIRAC for
                    gates, waypoints and all
                    other Navigraph-related stuff
                </div>
            </div>
        </template>
    </common-info-popup>
</template>

<script setup lang="ts">
import CommonInfoPopup from '~/components/common/popup/CommonInfoPopup.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import { useStore } from '~/store';
import { defu } from 'defu';
import type { UserSettings } from '~/utils/backend/user';

const model = defineModel({ type: Boolean, required: true });
const store = useStore();

const settings = reactive(defu<UserSettings, [UserSettings]>(store.user?.settings ?? {}, {
    autoFollow: false,
    autoZoom: false,
}));

watch(settings, () => {
    $fetch('/api/user/settings', {
        method: 'POST',
        body: settings,
    });
    store.user!.settings = settings;
});
</script>

<style scoped lang="scss">
.settings {
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

        &--unlimited .settings__navigraph_status {
            color: $success500;
        }
    }
}
</style>
