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
                v-if="!currentPreset && Object.keys(selectedPreset).length"
                class="presets__create __info-sections"
            >
                <common-block-title remove-margin>
                    Save Current Settings
                </common-block-title>

                <div class="presets__row presets__row--no-wrap">
                    <common-input-text
                        v-model="newPresetName"
                        placeholder="Preset Name"
                    />
                    <div class="presets__row_divider"/>
                    <common-button
                        :disabled="presets.length >= maxPresets || !newPresetName"
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
                v-if="presets.length >= maxPresets"
                class="presets__warning"
            >
                Maximum number of presets is {{ maxPresets }}.
            </small>

            <template v-if="presets.length">
                <template
                    v-for="preset in presets"
                    :key="preset.id"
                >
                    <common-block-title
                        class="presets__list-title"
                        :collapsed="activePreset?.id !== preset.id"
                        remove-margin
                        @update:collapsed="!$event ? activePreset = preset : activePreset = null"
                    >
                        {{ preset.name }}

                        <template #append>
                            <common-toggle
                                :model-value="currentPreset === preset.id"
                                @click.stop
                                @update:modelValue="$event ? [states.load = true, activePreset = preset] : emit('reset')"
                            />
                        </template>
                    </common-block-title>

                    <template v-if="activePreset?.id === preset.id">
                        <div
                            class="__grid-info-sections"
                            :class="{ '__grid-info-sections--large-title': isMobile }"
                        >
                            <div class="__grid-info-sections_title">
                                Preset
                            </div>
                            <div class="presets__row">
                                <common-input-text
                                    v-model="activePreset.name"
                                    @change="renamePreset()"
                                />
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
                                    v-if="shareUrl"
                                    location="bottom"
                                    open-method="mouseOver"
                                >
                                    <template #activator>
                                        <common-button
                                            size="S"
                                            type="secondary"
                                            @click="share.copy(shareUrl)"
                                        >
                                            <template #icon>
                                                <check-icon v-if="share.copyState.value"/>
                                                <share-icon v-else/>
                                            </template>
                                        </common-button>
                                    </template>

                                    Share
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
                            </div>
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
                        @click="[emit('save', activePreset.json), states.load = false]"
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
import { useFileDownload } from '~/composables/settings';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import SaveIcon from 'assets/icons/kit/save.svg?component';
import ExportIcon from 'assets/icons/kit/load.svg?component';
import EditIcon from 'assets/icons/kit/edit.svg?component';
import CommonTooltip from '~/components/common/basic/CommonTooltip.vue';
import ShareIcon from '@/assets/icons/kit/share.svg?component';
import CheckIcon from '@/assets/icons/kit/check.svg?component';
import type { UserPreset } from '@prisma/client';
import { useStore } from '~/store';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import equal from 'deep-equal';

const props = defineProps({
    presets: {
        type: Array as PropType<UserPreset[]>,
        required: true,
    },
    selectedPreset: {
        type: Object as PropType<UserCustomPreset['json']>,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    endpointSuffix: {
        type: String,
        required: true,
    },
    refresh: {
        type: Function,
        required: true,
    },
    maxPresets: {
        type: Number,
        required: true,
    },
    hasShare: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits({
    create(name: string, data: UserCustomPreset['json']) {
        return true;
    },
    save(data: UserCustomPreset['json']) {
        return true;
    },
    reset() {
        return true;
    },
});
const config = useRuntimeConfig();
export type UserCustomPreset = Omit<UserPreset, 'json'> & { [key: string]: any };

const shareUrl = computed(() => {
    if (!props.hasShare || !activePreset.value) return;

    return `${ config.public.DOMAIN }?${ props.type }=${ activePreset.value.id }`;
});

const share = useCopyText();

const store = useStore();

const newPresetName = ref('');
const activePreset = shallowRef<UserCustomPreset | null>(null);
const isMobile = useIsMobile();

const currentPreset = computed(() => {
    return props.presets.find(x => equal(x.json, props.selectedPreset))?.id ?? null;
});

watch(currentPreset, () => {
    if (!activePreset.value && currentPreset.value) activePreset.value = props.presets.find(x => x.id === currentPreset.value) ?? null;
}, {
    immediate: true,
});

const states = reactive({
    delete: false,
    rename: false,
    load: false,
    overwrite: false,
});

const isCurrentPreset = (preset: UserCustomPreset) => {
    return currentPreset.value === preset.id;
};

const createPreset = async () => {
    emit('create', newPresetName.value, props.selectedPreset);
};

const exportPreset = (preset: UserCustomPreset) => {
    useFileDownload({
        fileName: `vatsim-radar-${ props.type }-${ preset.name.replaceAll(' ', '-') }-${ Date.now() }.json`,
        mime: 'application/json',
        blob: new Blob([JSON.stringify(preset)], { type: 'application/json' }),
    });
};

const overwritePreset = async () => {
    await $fetch<UserCustomPreset>(`/api/user/${ props.endpointSuffix }/${ activePreset.value!.id }`, {
        method: 'PUT',
        body: {
            json: toRaw(props.selectedPreset),
        },
    });
    props.refresh();
};

const renamePreset = async () => {
    await $fetch<UserCustomPreset>(`/api/user/${ props.endpointSuffix }/${ activePreset.value!.id }`, {
        method: 'PUT',
        body: {
            name: activePreset.value!.name,
        },
    });
};

const deletePreset = async () => {
    await $fetch<UserCustomPreset>(`/api/user/${ props.endpointSuffix }/${ activePreset.value!.id }`, {
        method: 'DELETE',
    });
    states.delete = false;
    await props.refresh();
    activePreset.value = null;
};
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
        :deep(.title_append) {
            margin-right: auto;
        }
    }

    &__delete {
        display: flex;
        justify-content: flex-end;
    }
}
</style>
