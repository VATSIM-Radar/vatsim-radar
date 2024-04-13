<template>
    <header class="header">
        <div class="header_left">
            <div class="header__logo">
                Vatsim Radar
            </div>
            <div class="header__sections">
                <div class="header__sections_section header__buttons">
                    <common-button
                        v-for="button in buttons"
                        :key="button.text"
                        :type="button.path === route.path ? 'primary' : 'secondary'"
                        :disabled="button.disabled"
                        :to="button.path"
                    >
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
                <common-button size="S" type="secondary" @click="!store.user ? loginPopup = true : settingsPopup = true">
                    Settings
                </common-button>
                <common-button size="S" href="https://discord.gg/MtFKhMPePe" target="_blank" type="secondary">
                    Discord
                </common-button>
            </div>

            <common-info-popup
                class="header__settings"
                absolute
                v-model="settingsPopup"
                collapsible
                :tabs="{
                    test1: {
                        title: 'test',
                        sections: [
                            {title: 'Current Flight Details', collapsible: true, key: 'test1'},
                            {title: 'Test', key: 'test2'},
                            {key: 'test3'}
                        ]
                    },
                    test2: {
                        title: 'Test 2',
                        sections: [{title: 'test', key: 'test4'}]
                    }
                }"
                :header-actions="['test']"
            >
                <template #title>
                    Settings
                </template>
                <template #action-test>
                    Test
                </template>
                <template #test1>
                    Test 1
                </template>
                <template #test2>
                    Test 2
                </template>
                <template #test3>
                    Test 3
                </template>
                <template #test4>
                    Test 4
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
    </header>
</template>

<script setup lang="ts">
import { useStore } from '~/store';

const route = useRoute();
const store = useStore();

const buttons = computed(() => {
    return [
        {
            text: 'Map',
            path: '/',
        },
        {
            text: 'Events',
            disabled: true,
        },
        {
            text: 'Stats',
            disabled: true,
        },
        {
            text: 'Roadmap',
            path: '/roadmap',
        },
    ];
});

const loginPopup = ref(false);
const settingsPopup = ref(false);
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
        cursor: default;
        user-select: none;
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
    }
}
</style>
