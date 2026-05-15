<template>
    <popup-fullscreen
        :model-value="store.cookieCustomize"
        @update:modelValue="store.cookieCustomize = false"
    >
        <template #title>
            Choose privacy policy settings
        </template>

        <div class="consent-popup_things __info-sections">
            <div class="consent-popup_item consent-popup_item--enabled consent-popup_item--disabled">
                <ui-checkbox
                    class="consent-popup_item_checkbox"
                    model-value
                >
                    Required Data
                </ui-checkbox>
                <div class="consent-popup_item_text">
                    Cookies, storage. Learn more:
                    <a
                        class="__link"
                        href="/privacy-policy"
                        target="_blank"
                    >Privacy Policy</a>.

                    This one is required for us to work correctly.
                </div>
            </div>
            <div
                class="consent-popup_item"
                :class="{ 'consent-popup_item--enabled': policy.rum }"
                @click="policy.rum = !policy.rum"
            >
                <ui-checkbox
                    v-model="policy.rum"
                    class="consent-popup_checkbox"
                    @click.stop
                >
                    CloudFlare Beacon
                </ui-checkbox>
                <div class="consent-popup_item_text">
                    Privacy-focused script to collect page load performance -
                    <a
                        class="__link"
                        href="https://developers.cloudflare.com/web-analytics/data-metrics/"
                        target="_blank"
                        @click.stop
                    >Learn More</a>.
                </div>
            </div>
            <div
                v-if="false"
                class="consent-popup_item"
                :class="{ 'consent-popup_item--enabled': policy.sentry }"
                @click="policy.sentry = !policy.sentry"
            >
                <ui-checkbox
                    v-model="policy.sentry"
                    class="consent-popup_checkbox consent-popup_checkbox--disabled"
                    @click.stop
                >
                    Sentry Error Reporting
                </ui-checkbox>
                <div class="consent-popup_item_text">
                    This setting allows us to also send your VATSIM CID and request IP address to Sentry, as well as browser performance data. Error reporting is always enabled - but anonymous if this is not selected
                </div>
            </div>
        </div>

        <template #actions>
            <ui-button
                v-if="store.cookieCustomize !== 'init'"
                @click="store.cookieCustomize = false"
            >
                Save
            </ui-button>
            <template v-else>
                <ui-button
                    type="secondary"
                    @click="store.cookieCustomize = false"
                >
                    Cancel
                </ui-button>
                <ui-button @click="[policy.accepted = 1, store.cookieCustomize = false]">
                    Agree
                </ui-button>
            </template>
        </template>
    </popup-fullscreen>
</template>

<script setup lang="ts">
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiCheckbox from '~/components/ui/inputs/UiCheckbox.vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import { useStore } from '~/store';

const store = useStore();
const policy = cookiePolicyStatus();
</script>

<style scoped lang="scss">
.consent-popup {
    &_item {
        cursor: pointer;
        user-select: none;

        display: flex;
        flex-direction: column;
        gap: 8px;

        padding: 8px;
        border: 1px solid varToRgba('lightGray400', 0.15);
        border-radius: 8px;

        background: $darkGray700;

        transition: 0.3s;

        &--disabled {
            cursor: default;

            .consent_item_checkbox {
                pointer-events: none;
                opacity: 0.8;
            }
        }

        &--enabled {
            border-color: $blue300;
        }

        &_text {
            font-size: 14px;
        }
    }
}
</style>
