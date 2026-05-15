<template>
    <div
        v-if="!policy.accepted || policy.accepted <= 0"
        class="consent"
    >
        <div class="consent_introduction __info-sections">
            <div class="consent_title">
                Data Policy
            </div>
            <div class="consent_description">
                Uh oh! VATSIM Radar wants to share some little data with 3rd party. What do we do?
            </div>
        </div>
        <div class="consent_actions">
            <ui-button
                type="secondary"
                @click="store.cookieCustomize = 'init'"
            >
                Customize
            </ui-button>
            <ui-button @click="policy.accepted = 1">
                Accept All
            </ui-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import UiButton from '~/components/ui/buttons/UiButton.vue';

const policy = cookiePolicyStatus();
const store = useStore();
</script>

<style scoped lang="scss">
.consent {
    position: fixed;
    z-index: 10;
    bottom: 56px;
    left: 50%;
    transform: translateX(-50%);

    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;

    width: 650px;
    max-width: 90%;
    padding: 16px;
    border-radius: 8px;

    background: $darkGray800;

    @include mobileOnly {
        flex-direction: column;
        align-items: stretch;
    }

    &_title {
        font-size: 18px;
        font-weight: 600;
    }

    &_description {
        font-size: 14px;
    }

    &_actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &_introduction {
        align-self: stretch;
        justify-content: space-evenly;
    }
}
</style>
