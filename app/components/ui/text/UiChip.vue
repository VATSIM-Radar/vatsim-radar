<template>
    <ui-text
        class="chip"
        :class="[`chip--variant-${ variant }`, { 'chip--type-time': time, [`chip--facility-${ atcFacility }`]: typeof atcFacility === 'number', 'chip--type-atc': typeof atcFacility === 'number' }]"
        :style="{ '--atc-color': typeof atcFacility === 'number' && getFacilityPositionColor(atcFacility) }"
        :type="textType"
    >
        <div
            v-if="$slots.prepend"
            class="chip_prepend"
        >
            <slot name="prepend"/>
        </div>
        <div class="chip_content">
            <slot>
                <template v-if="typeof atcFacility === 'number'">
                    <template v-if="!atcSmallIcon">
                        {{atcFacility === -1 ? 'ATIS' : dataStore.vatsim.data.facilities.value.find(x => x.id === atcFacility)?.short}}
                    </template>
                    <template v-else>
                        {{atcFacility === -1 ? 'A' : dataStore.vatsim.data.facilities.value.find(x => x.id === atcFacility)?.short.slice(0,1)}}
                    </template>
                </template>
                <template v-else-if="time">
                    {{`${ typeof time === 'string' ? time : zuluTime.format(time) }${ timeVariant !== 'time' ? 'Z' : '' }`}}
                </template>
            </slot>
        </div>
        <div
            v-if="$slots.append"
            class="chip_append"
        >
            <slot name="append"/>
        </div>
        <div
            v-if="model === true"
            class="chip_close"
            @click="model = false"
        >
            <close-icon/>
        </div>
    </ui-text>
</template>

<script setup lang="ts">
import CloseIcon from '@/assets/icons/basic/close.svg?component';
import UiText from '~/components/ui/text/UiText.vue';
import type { UiTextTypes } from '~/components/ui/text/UiText.vue';
import { getFacilityPositionColor } from '~/composables/vatsim/controllers';

const props = defineProps({
    variant: {
        type: String as PropType<'accent' | 'default'>,
        default: 'default',
    },
    time: {
        type: [String, Object] as PropType<string | Date>,
    },
    timeVariant: {
        type: String as PropType<'time' | 'timeZ' | 'timeSecondsZ'>,
        default: 'timeZ',
    },
    atcFacility: {
        type: Number,
    },
    atcSmallIcon: {
        type: Boolean,
        default: false,
    },
    textType: {
        type: String as PropType<UiTextTypes>,
        default: 'caption',
    },
});

defineSlots<{
    prepend: () => any;
    default: () => any;
    append: () => any;
}>();

const store = useStore();
const dataStore = useDataStore();

const model = defineModel({ type: Boolean });

const zuluTime = computed(() => new Intl.DateTimeFormat(['en-GB'], {
    hourCycle: store.user?.settings.timeFormat === '12h' ? 'h12' : 'h23',
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: props.timeVariant === 'timeSecondsZ' ? '2-digit' : undefined,
}));
</script>

<style scoped lang="scss">
.chip {
    cursor: default;

    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: center;

    min-height: 16px;
    padding: 4px;
    border-radius: 2px;

    color: $lightGray200Orig;
    text-align: center;

    background: $darkGray600;

    &_close {
        cursor: pointer;

        display: flex;
        align-items: center;
        justify-content: center;

        width: 12px;
        min-width: 12px;

        svg {
            width: 8px;
        }
    }

    &--variant-accent {
        background: $blue500;
    }

    &--type-atc {
        --atc-color: #{$darkGray200};


        width: 32px;
        height: 16px;
        padding: 0;

        text-shadow: 0 1px 0 $blackAlpha24;

        background: var(--atc-color);
    }
}
</style>
