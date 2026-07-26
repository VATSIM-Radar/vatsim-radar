<template>
    <popup-fullscreen
        disabled
        :model-value="!!showLocalSettings || !!showMapSettings"
        width="600px"
    >
        <template #title>
            Settings Conflict
        </template>

        <div class="migration __vertical-group-16">
            <ui-text type="2b-medium">
                We have found local settings on your device. You need to decide what to do with them.
            </ui-text>

            <ui-setting-item :item="settingsItems.account.autoSave"/>

            <ui-columns-display>
                <template v-if="showLocalSettings" #col1>
                    <ui-text type="h5">
                        Local Settings
                    </ui-text>

                    <ui-text type="caption">
                        Local Settings contain map layers, sigmets, and other
                    </ui-text>

                    <ui-radio-group
                        v-model="localDecision"
                        :items="radioItems"
                    />
                </template>
                <template v-if="showMapSettings" #col2>
                    <ui-text type="h5">
                        Map Settings
                    </ui-text>

                    <ui-text type="caption">
                        Map Settings contain whole map settings tab.
                    </ui-text>

                    <ui-radio-group
                        v-model="mapDecision"
                        :items="radioItems"
                    />
                </template>
            </ui-columns-display>
            <br>
        </div>

        <template #actions>
            <ui-button
                :disabled="migrating || (!!showMapSettings && !mapDecision) || (!!showLocalSettings && !localDecision)"
                size="S"
                @click="migrate"
            >
                Confirm decision. This action is PERMANENT
            </ui-button>
        </template>
    </popup-fullscreen>
</template>

<script setup lang="ts">
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import UiColumnsDisplay from '~/components/ui/data/UiColumnsDisplay.vue';
import UiText from '~/components/ui/text/UiText.vue';
import UiRadioGroup from '~/components/ui/inputs/UiRadioGroup.vue';
import type { RadioItemGroup } from '~/components/ui/inputs/UiRadioGroup.vue';
import type { UserLegacyLocalSettings } from '~/types/map';
import type { IUserLegacyMapSettings } from '~/utils/server/handlers/map-settings';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import { useRadarError } from '~/composables/errors';
import { migrateV1Settings } from '~/utils/settings/migration';
import { sendUserPreset } from '~/composables/fetchers';
import UiSettingItem from '~/components/ui/data/UiSettingItem.vue';

const localDecision = ref<'all' | 'new' | 'skip' | number | null>(null);
const mapDecision = ref<'all' | 'new' | 'skip' | number | null>(null);
const migrating = ref(false);
const settingsStore = useSettingsStore();
const settingsItems = getSettingsItems().value;

const localSettings = shallowRef<UserLegacyLocalSettings | null>(null);
const mapSettings = shallowRef<IUserLegacyMapSettings | null>(null);

const allowedLocal = ['location', 'zoom', 'vatglassesLevel', 'sigmetsDate', 'app'];

const showLocalSettings = computed(() => {
    const keys = Object.keys(localSettings.value ?? {});
    return localSettings.value && keys.length && !keys.every(x => allowedLocal.includes(x));
});
const showMapSettings = computed(() => mapSettings.value && Object.keys(mapSettings.value).length);

const radioItems = computed(() => {
    const items: RadioItemGroup[] = [
        { value: 'skip', text: `Don't transfer. Everything will be lost` },
    ];

    if (settingsStore.settingsPresets?.length) {
        items.push(...settingsStore.settingsPresets.map(x => ({ value: x.id, text: `Add to ${ x.name }` })));
        if (settingsStore.settingsPresets?.length > 1) {
            items.push({ value: 'all', text: 'Add to all above' });
        }
    }
    else {
        items.push({ value: 'new', text: 'Create new preset and move to it' });
    }

    return items;
});

onMounted(() => {
    localSettings.value = JSON.parse(localStorage.getItem('local-settings') ?? null as unknown as string);
    mapSettings.value = JSON.parse(localStorage.getItem('map-settings') ?? null as unknown as string);
});

async function migrate() {
    migrating.value = true;

    try {
        if (mapDecision.value === 'new' || localDecision.value === 'new') {
            await sendUserPreset('Default', {}, 'settings/v2', () => new Promise<void>(resolve => resolve));
            await settingsStore.fetchPresets();
            settingsStore.activeSettingsPreset = settingsStore.settingsPresets[0]?.id ?? null;

            if (mapDecision.value !== 'skip') mapDecision.value = 'all';
            if (localDecision.value !== 'skip') localDecision.value = 'all';
        }

        if (mapDecision.value && mapSettings.value && mapDecision.value !== 'skip') {
            const targetPresets = typeof mapDecision.value === 'number' ? [settingsStore.settingsPresets.find(x => x.id === mapDecision.value)!] : settingsStore.settingsPresets;
            const migratedJson = migrateV1Settings({
                mapSettings: mapSettings.value,
            });

            await Promise.all(targetPresets.map(x => $fetch(`/api/user/settings/v2/${ x.id }`, {
                method: 'PUT',
                body: {
                    json: customDefu(x.json, migratedJson),
                },
            })));
        }

        await settingsStore.fetchPresets();

        if (localDecision.value && localSettings.value && localDecision.value !== 'skip') {
            const targetPresets = typeof localDecision.value === 'number' ? [settingsStore.settingsPresets.find(x => x.id === localDecision.value)!] : settingsStore.settingsPresets;
            const migratedJson = migrateV1Settings({
                localSettings: localSettings.value,
            });

            await Promise.all(targetPresets.map(x => $fetch(`/api/user/settings/v2/${ x.id }`, {
                method: 'PUT',
                body: {
                    json: customDefu(x.json, migratedJson),
                },
            })));
        }

        await settingsStore.fetchPresets();
        await settingsStore.save({});

        if (localSettings.value) {
            for (const key in localSettings.value) {
                // @ts-expect-error dynamic key
                if (!allowedLocal.includes(key)) delete localSettings.value[key];
            }

            localStorage.setItem('local-settings', JSON.stringify(toRaw(localSettings.value)));
        }

        localStorage.removeItem('map-settings');
        localSettings.value = null;
        mapSettings.value = null;
    }
    catch (e) {
        useRadarError(e);
    }

    migrating.value = false;
}
</script>
