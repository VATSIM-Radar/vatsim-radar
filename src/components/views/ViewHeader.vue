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
                <common-button size="S" href="/auth/vatsim/redirect">
                    Connect Vatsim
                </common-button>
            </div>
            <div class="header__sections_section">
                <common-button size="S" type="secondary" @click="loginPopup = true">
                    Settings
                </common-button>
                <common-button size="S" href="https://discord.gg/MtFKhMPePe" target="_blank" type="secondary">
                    Discord
                </common-button>
            </div>
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
const route = useRoute();

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

    &__logo {
        font-size: 31px;
        font-weight: 700;
        font-family: $openSansFont;
        color: $primary500;
        cursor: default;
        user-select: none;
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
}
</style>
