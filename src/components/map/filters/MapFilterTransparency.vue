<template>
    <common-select
        v-model="setting"
        :items="options"
        :placeholder
    />
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { UserLayersTransparencySettings } from '~/types/map';
import type { SelectItem } from '~/types/components/select';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import { useStore } from '~/store';

const props = defineProps({
    setting: {
        type: String as PropType<keyof UserLayersTransparencySettings>,
        required: true,
    },
    minOpacity: {
        type: Number,
        default: 1,
    },
    maxOpacity: {
        type: Number,
        default: 0.2,
    },
    placeholder: {
        type: String,
        default: 'Transparency',
    },
});

const store = useStore();

const setting = computed({
    get() {
        return store.localSettings.filters?.layers?.transparencySettings?.[props.setting] ?? null;
    },
    set(value: number | null) {
        setUserLocalSettings({
            filters: {
                layers: {
                    transparencySettings: {
                        [props.setting]: value,
                    },
                },
            },
        });
    },
});

const options = computed<SelectItem[]>(() => {
    const _options: SelectItem[] = [];

    for (let i = props.maxOpacity; i <= props.minOpacity; i += 0.1) {
        _options.unshift({
            value: i,
            text: `${ Math.floor((1 - i) * 100) }%`,
        });
    }

    _options.unshift({
        value: 'default',
        text: 'Default',
    });

    return _options;
});
</script>
