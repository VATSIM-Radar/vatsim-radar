<template>
    <div
        v-if="presets"
        class="presets"
    >
        <div
            v-if="store.user"
            class="__info-sections"
        >
            <div
                v-if="!currentPreset"
                class="presets__create __info-sections"
            >
                <common-block-title>
                    Save Current Settings
                </common-block-title>

                <div class="presets__row presets__row--no-wrap">
                    <common-input-text
                        v-model="newPresetName"
                        placeholder="Preset Name"
                    />
                    <div class="presets__row_divider"/>
                    <common-button
                        :disabled="presets.length >= MAX_MAP_PRESETS || !newPresetName"
                        size="S"
                        type="secondary"
                        @click="createPreset"
                    >
                        <template #icon>
                            <save-icon/>
                        </template>
                    </common-button>
                </div>
            </div>

            <small
                v-if="presets.length >= MAX_MAP_PRESETS"
                class="presets__warning"
            >
                Maximum number of presets is {{ MAX_MAP_PRESETS }}.
            </small>

            <template v-if="presets.length">
                <common-block-title class="presets__list-title">
                    Saved Presets
                </common-block-title>

                <div
                    class="__grid-info-sections"
                    :class="{ '__grid-info-sections--large-title': isMobile }"
                >
                    <div class="__grid-info-sections_title">
                        Preset
                    </div>
                    <div class="presets__row">
                        <common-select
                            :items="presetsSelectList"
                            :model-value="activePreset?.id ?? null"
                            placeholder="Select preset"
                            width="100%"
                            @update:modelValue="activePreset = presets.find(x => x.id === $event) ?? null"
                        />
                        <template v-if="activePreset">
                            <div class="presets__row_divider"/>
                            <common-tooltip
                                location="bottom"
                                open-method="mouseOver"
                            >
                                <template #activator>
                                    <common-button
                                        size="S"
                                        type="secondary"
                                        @click="exportPreset(activePreset)"
                                    >
                                        <template #icon>
                                            <export-icon/>
                                        </template>
                                    </common-button>
                                </template>

                                Export
                            </common-tooltip>
                            <common-tooltip
                                location="bottom"
                                open-method="mouseOver"
                            >
                                <template #activator>
                                    <common-button
                                        :disabled="isCurrentPreset(activePreset)"
                                        size="S"
                                        type="secondary"
                                        @click="states.load = true"
                                    >
                                        <template #icon>
                                            <load-icon/>
                                        </template>
                                    </common-button>
                                </template>

                                Load
                            </common-tooltip>
                            <common-tooltip
                                location="left"
                                open-method="mouseOver"
                            >
                                <template #activator>
                                    <common-button
                                        :disabled="isCurrentPreset(activePreset)"
                                        size="S"
                                        type="secondary"
                                        @click="states.overwrite = true"
                                    >
                                        <template #icon>
                                            <edit-icon/>
                                        </template>
                                    </common-button>
                                </template>

                                Overwrite
                            </common-tooltip>
                        </template>
                    </div>
                </div>

                <template v-if="activePreset">
                    <div
                        class="__grid-info-sections"
                        :class="{ '__grid-info-sections--large-title': isMobile }"
                    >
                        <div class="__grid-info-sections_title">
                            Rename Preset
                        </div>
                        <common-input-text
                            v-model="activePreset.name"
                            @change="renamePreset()"
                        />
                    </div>
                    <div class="presets__delete">
                        <common-button
                            focus-color="error700"
                            hover-color="error300"
                            link-color="error500"
                            theme="red"
                            type="link"
                            @click="states.delete = true"
                        >
                            Delete preset
                        </common-button>
                    </div>
                </template>
            </template>
        </div>
        <common-button
            v-else
            href="/api/auth/vatsim/redirect"
        >
            Authorize to manage presets
        </common-button>

        <template v-if="activePreset">
            <common-popup v-model="states.load">
                <template #title>
                    Preset Load
                </template>
                You are about to load {{ activePreset.name }} preset. That will overwrite all your current settings.
                <template #actions>
                    <common-button
                        type="secondary-875"
                        @click="[saveMapSettings(activePreset.json), states.load = false]"
                    >
                        Load and overwrite
                    </common-button>
                    <common-button @click="states.load = false">
                        Cancel
                    </common-button>
                </template>
            </common-popup>
            <common-popup v-model="states.overwrite">
                <template #title>
                    Preset Overwrite
                </template>
                You are about to overwrite {{ activePreset.name }} preset with current settings. That will delete all previous selected preset data.
                <template #actions>
                    <common-button
                        type="secondary-875"
                        @click="[overwritePreset(), states.overwrite = false]"
                    >
                        Overwrite preset
                    </common-button>
                    <common-button @click="states.overwrite = false">
                        Cancel
                    </common-button>
                </template>
            </common-popup>
            <common-popup
                v-model="states.delete"
                width="600px"
            >
                <template #title>
                    Preset Delete
                </template>
                You are about to <strong>permanently</strong> delete {{ activePreset.name }} preset
                <template #actions>
                    <common-button
                        primary-color="error500"
                        type="secondary-flat"
                        @click="deletePreset()"
                    >
                        Permanently delete
                    </common-button>
                    <common-button
                        type="secondary-875"
                        @click="exportPreset(activePreset)"
                    >
                        Backup data
                    </common-button>
                    <common-button
                        type="primary"
                        @click="states.delete = false"
                    >
                        Cancel that
                    </common-button>
                </template>
            </common-popup>
        </template>
    </div>
</template>

<script setup lang="ts">
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import type { UserMapPreset, UserMapSettings } from '~/utils/backend/handlers/map-settings';
import { useStore } from '~/store';
import type { _AsyncData } from '#app/composables/asyncData';
import { MAX_MAP_PRESETS } from '~/utils/shared';
import { saveMapSettings, useFileDownload } from '~/composables/settings';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import SaveIcon from 'assets/icons/kit/save.svg?component';
import type { SelectItem } from '~/types/components/select';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import ExportIcon from 'assets/icons/kit/load.svg?component';
import LoadIcon from 'assets/icons/kit/load-on-pc.svg?component';
import EditIcon from 'assets/icons/kit/edit.svg?component';
import CommonTooltip from '~/components/common/basic/CommonTooltip.vue';

import { sendUserMapSettings } from '~/composables/fetchers/map-settings';

const props = defineProps({
    refreshPresets: {
        type: Function as PropType<_AsyncData<any, any>['refresh']>,
        required: true,
    },
});
const store = useStore();
const presets = computed(() => store.mapPresets);

const newPresetName = ref('');
const activePreset = shallowRef<UserMapPreset | null>(null);
const isMobile = useIsMobile();

const currentPreset = computed(() => {
    return presets.value.find(x => JSON.stringify(x.json) === JSON.stringify(store.mapSettings))?.id ?? null;
});

watch(currentPreset, () => {
    if (!activePreset.value && currentPreset.value) activePreset.value = presets.value.find(x => x.id === currentPreset.value) ?? null;
}, {
    immediate: true,
});

const states = reactive({
    delete: false,
    rename: false,
    load: false,
    overwrite: false,
});


const isCurrentPreset = (preset: UserMapPreset) => {
    return currentPreset.value === preset.id;
};

const createPreset = async () => {
    await saveMapSettings(await sendUserMapSettings(newPresetName.value, store.mapSettings, createPreset));
    props.refreshPresets();
};

const exportPreset = (preset: UserMapPreset) => {
    useFileDownload({
        fileName: `vatsim-radar-${ preset.name.replaceAll(' ', '-') }-${ Date.now() }.json`,
        mime: 'application/json',
        blob: new Blob([JSON.stringify(preset)], { type: 'application/json' }),
    });
};

const overwritePreset = async () => {
    await $fetch<UserMapSettings>(`/api/user/settings/map/${ activePreset.value!.id }`, {
        method: 'PUT',
        body: {
            json: toRaw(store.mapSettings),
        },
    });
    props.refreshPresets();
};

const renamePreset = async () => {
    await $fetch<UserMapSettings>(`/api/user/settings/map/${ activePreset.value!.id }`, {
        method: 'PUT',
        body: {
            name: activePreset.value!.name,
        },
    });
};

const deletePreset = async () => {
    await $fetch<UserMapSettings>(`/api/user/settings/map/${ activePreset.value!.id }`, {
        method: 'DELETE',
    });
    states.delete = false;
    await props.refreshPresets();
    activePreset.value = null;
};

const presetsSelectList = computed<SelectItem[]>(() => presets.value.map(x => ({
    value: x.id,
    text: x.name,
})));
</script>

<style scoped lang="scss">
.presets {
    &__row {
        display: flex;
        gap: 16px;
        align-items: center;

        &:not(.presets__row--no-wrap) {
            @include mobileOnly {
                flex-wrap: wrap;
                row-gap: 8px;
            }
        }

        .button {
            min-width: 32px;
        }

        &_divider {
            width: 1px;
            height: 24px;
            background: varToRgba('lightgray150', 0.2);

            @include mobileOnly {
                display: none;
            }
        }
    }

    &__warning {
        color: $error400;
    }

    &__list-title {
        margin-top: 8px;
    }

    &__delete {
        display: flex;
        justify-content: flex-end;
        margin-top: 8px;
    }
}
</style>
