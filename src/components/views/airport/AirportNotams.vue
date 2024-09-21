<template>
    <div
        v-if="notams?.length"
        class="__info-sections notams"
    >
        <div class="notams_info">
            <div class="notams_info_image">
                <img
                    alt="FAA"
                    src="~/assets/images/FAA-logo.svg"
                >
            </div>
            <span>
                Data provided by <strong>FAA</strong>
            </span>
        </div>
        <common-copy-info-block :text="notams.map(x => x.formattedText ?? x.text).join('\n\n')"/>
        <div
            v-for="(notam, index) in notams"
            :key="index"
            class="notams_notam"
        >
            <common-copy-info-block :text="notam.text">
                {{ notam.number }}
                <template #prepend>
                    <common-info-block :bottom-items="[notam.classification, getNotamType(notam.type)]">
                        <template #top>
                            <span
                                v-if="notam.effectiveFrom || notam.effectiveTo"
                                class="notams__date"
                            >
                                <template v-if="notam.effectiveFrom">
                                    <strong>{{ notam.effectiveFrom.startsWith('20') ? `${ formatDateDime.format(new Date(notam.effectiveFrom)) }Z` : notam.effectiveFrom }}</strong>
                                </template>
                                <template v-if="notam.effectiveTo">
                                    To <strong>{{ notam.effectiveTo.startsWith('20') ? `${ formatDateDime.format(new Date(notam.effectiveTo)) }Z` : notam.effectiveTo }}</strong>
                                </template>
                            </span>
                        </template>
                    </common-info-block>
                </template>
            </common-copy-info-block>
        </div>
    </div>
</template>

<script setup lang="ts">
import { injectAirport } from '~/composables/airport';
import CommonCopyInfoBlock from '~/components/common/blocks/CommonCopyInfoBlock.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import type { VatsimAirportDataNotam } from '~/server/api/data/vatsim/airport/[icao]/notams';

const data = injectAirport();
const notams = computed(() => data.value.notams);

const getNotamType = (type: VatsimAirportDataNotam['type']) => {
    switch (type) {
        case 'C':
            return 'Canceled';
        case 'N':
            return 'New';
        case 'R':
            return 'Replaced';
    }

    return '';
};

const formatDateDime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    year: '2-digit',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});
</script>

<style lang="scss" scoped>
.notams {
    &_info {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: center;

        margin-bottom: 16px;

        font-size: 14px;

        img {
            width: 56px;
        }
    }

    &__date {
        display: block;
        margin-bottom: 4px;
        font-size: 11px;
        line-height: 100%;
    }

    &_notam {
        margin-top: 8px;
        padding-top: 16px;
        border-top: 1px solid $darkgray875;
    }
}
</style>
