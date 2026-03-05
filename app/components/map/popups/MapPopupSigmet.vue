<template>
    <map-html-overlay
        class="sigmets-overlay"
        :settings="{ position: payload.coordinate, stopEvent: true, positioning: 'top-center' }"
        :z-index="20"
        @id="$emit('id', $event)"
        @pointermove.stop
        @update:overlay="!$event && emit('close')"
    >
        <popup-map-info
            class="sigmets"
            content-full-height
            @mouseleave="emit('close')"
        >
            <template #title>
                SIGMETs
            </template>
            <div class="sigmets_list">
                <div
                    v-for="(sigmet, index) in payload.additionalPayload"
                    :key="index"
                    class="sigmets__sigmet"
                >
                    <div
                        v-for="field in sigmetFields(sigmet)"
                        :key="field[0]"
                        class="__grid-info-sections __grid-info-sections--vertical"
                    >
                        <div class="__grid-info-sections_title">
                            {{ field[0] }}
                        </div>
                        <span>
                            {{ field[1] }}
                        </span>
                    </div>
                </div>
            </div>
        </popup-map-info>
    </map-html-overlay>
</template>

<script setup lang="ts">
import MapHtmlOverlay from '~/components/map/MapHtmlOverlay.vue';
import PopupMapInfo from '~/components/popups/PopupMapInfo.vue';
import type { RadarEventPayload } from '~/composables/vatsim/events';
import type {
    FeatureSigmet, FeatureSIGMETProperties,
} from '~/utils/map/entities';
import type { Sigmet } from '~/utils/server/storage';

defineProps({
    payload: {
        type: Object as PropType<RadarEventPayload<FeatureSigmet, FeatureSIGMETProperties[]>>,
        required: true,
    },
});

const emit = defineEmits({
    id(id: string) {
        return true;
    },
    close() {
        return true;
    },
});

const store = useStore();

const zuluTime = new Intl.DateTimeFormat(['en-GB'], {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
});

const zuluDate = new Intl.DateTimeFormat(['en-GB'], {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'long',
});

const sigmetFields = (sigmet: Sigmet['properties']): [string, string | number][] => {
    const fields: [string, string][] = [];

    if (store.localSettings?.filters?.layers?.sigmets?.raw && sigmet.raw && (sigmet.dataType === 'sigmet' || sigmet.dataType === 'airsigmet')) {
        return [['', sigmet.raw]];
    }

    if (sigmet.region || sigmet.regionName) fields.push(['Region / FIR', `${ sigmet.region || sigmet.regionName || '' }`]);
    if (sigmet.type || sigmet.hazard) fields.push(['Hazard / Type', `${ sigmet.hazard ?? '' } ${ sigmet.type ? ` / ${ sigmet.type }` : '' }`]);
    if (sigmet.qualifier) fields.push(['Qualifier', `${ sigmet.qualifier ?? '' }`]);
    if (sigmet.timeFrom) {
        const from = new Date(sigmet.timeFrom);
        const to = new Date(sigmet.timeTo ?? '');

        let text = `${ zuluDate.format(from) } ${ zuluTime.format(from) }Z`;

        if (sigmet.timeTo) text += ` - ${ zuluTime.format(to) }Z`;

        fields.push(['Active', text]);
    }

    if ((sigmet.base !== null && sigmet.base !== undefined) || (sigmet.top !== null && sigmet.top !== undefined)) {
        const text: string[] = [];

        if (sigmet.base !== null && sigmet.base !== undefined) text.push(`From ${ sigmet.base }`);
        if (sigmet.top !== null && sigmet.top !== undefined) text.push(`To ${ sigmet.top }`);

        fields.push(['Level / Alt', text.join(' | ')]);
    }

    if (sigmet.dir || sigmet.spd || sigmet.change) {
        const text: string[] = [];

        if (sigmet.dir) text.push(`DIR ${ sigmet.dir }`);
        if (sigmet.spd) text.push(`SPD ${ sigmet.spd }`);
        if (sigmet.change) text.push(`${ sigmet.change }`);

        fields.push(['Info', text.join(' / ')]);
    }

    if (sigmet.raw) fields.push(['Raw', sigmet.raw]);

    return fields;
};
</script>

<style scoped lang="scss">
.sigmets {
    &_list {
        cursor: initial;

        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;

        max-height: 300px;
    }

    &__sigmet {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        max-width: 350px;
        padding: 8px;
        border-radius: 4px;

        font-size: 13px;
        overflow-wrap: anywhere;

        &:not(:only-child) {
            padding: 0;
            background: $darkGray800;
        }

        @include mobileOnly {
            max-width: 70dvw;
        }

        .__grid-info-sections {
            gap: 0 !important;

            &:not(:only-child) {
                padding: 8px;
                border-radius: 8px;
                background: $darkGray600;
            }
        }
    }
}
</style>
