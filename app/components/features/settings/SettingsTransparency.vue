<template>
    <ui-select
        v-model="setting"
        :items="options"
        :placeholder
    />
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { UserLayersTransparencySettings } from '~/types/map';
import type { SelectItem } from '~/types/components/select';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';

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
        default: 0.1,
    },
    placeholder: {
        type: String,
        default: 'Transparency',
    },
});

const setting = computed({
    get() {
        if (props.setting === 'osm') return getKeyedValueFromSettings('map.layers.transparency.osm');
        if (props.setting === 'satellite') return getKeyedValueFromSettings('map.layers.transparency.satellite');
        if (props.setting === 'weatherDark') return getKeyedValueFromSettings('map.layers.transparency.weatherDark');
        if (props.setting === 'weatherLight') return getKeyedValueFromSettings('map.layers.transparency.weatherLight');
        if (props.setting === 'sigmets') return getKeyedValueFromSettings('map.layers.transparency.sigmets');
        return null;
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
        if (props.setting === 'sigmets' && i > 0.5) continue;
        _options.unshift({
            value: i,
            text: `${ Math.floor((1 - i) * 100) }%`,
        });
    }

    if (props.setting === 'sigmets') {
        _options.push({
            value: 0.05,
            text: '95%',
        });

        _options.push({
            value: 0.025,
            text: '97.5%',
        });
    }

    _options.unshift({
        value: '',
        text: 'Default',
    });

    return _options;
});
</script>
