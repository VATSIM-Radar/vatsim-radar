<template>
    <div
        v-if="notams?.length"
        class="__info-sections notams"
    >
        <common-copy-info-block :text="notams.map(x => x.content).join('\n\n')"/>
        <div
            v-for="(notam, index) in notams"
            :key="index"
            class="notams_notam"
        >
            <common-copy-info-block :text="notam.content">
                {{ notam.title }}
                <template #prepend>
                    <span
                        v-if="notam.startDate || notam.endDate"
                        class="notams__date"
                    >
                        <template v-if="notam.startDate">
                            <strong>{{ formatDateDime.format(notam.startDate) }}Z</strong>
                        </template>
                        <template v-if="notam.endDate">
                            To <strong>{{ formatDateDime.format(notam.endDate) }}Z</strong>
                        </template>
                    </span>
                </template>
            </common-copy-info-block>
        </div>
    </div>
</template>

<script setup lang="ts">
import { injectAirport } from '~/composables/airport';
import CommonCopyInfoBlock from '~/components/common/blocks/CommonCopyInfoBlock.vue';

const data = injectAirport();
const notams = computed(() => data.value.notams);

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
    &__date {
        display: block;
        margin-bottom: 4px;
        font-size: 11px;
        line-height: 100%;
    }

    &_notam {
        margin-top: 8px;
        padding-top: 16px;
        border-top: 1px solid $neutral875;
    }
}
</style>
