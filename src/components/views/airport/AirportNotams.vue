<template>
    <div
        v-if="notams?.length"
        class="__info-sections notams"
    >
        <common-select
            :items="sortOptions"
            :model-value="store.localSettings.filters?.notamsSortBy ?? null"
            placeholder="Sort By"
            width="100%"
            @update:modelValue="setUserLocalSettings({ filters: { notamsSortBy: $event as any } })"
        />
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
                            <div class="notams__top">
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
                                <span
                                    v-if="notam.schedule"
                                    class="notams__calendar"
                                >
                                    <calendar-icon width="12"/>
                                    {{ notam.schedule }}
                                </span>
                            </div>
                        </template>
                    </common-info-block>
                </template>
            </common-copy-info-block>
        </div>
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
    </div>
</template>

<script setup lang="ts">
import { injectAirport } from '~/composables/airport';
import CommonCopyInfoBlock from '~/components/common/blocks/CommonCopyInfoBlock.vue';
import CommonInfoBlock from '~/components/common/blocks/CommonInfoBlock.vue';
import type { VatsimAirportDataNotam } from '~/server/api/data/vatsim/airport/[icao]/notams';
import type { NotamsSortBy } from '~/types/map';
import type { SelectItem } from '~/types/components/select';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import { useStore } from '~/store';
import CalendarIcon from '~/assets/icons/kit/event.svg?component';

const data = injectAirport();
const notams = computed(() => {
    const list = data.value.notams ?? [];

    const sortBy = store.localSettings.filters?.notamsSortBy ?? null;

    if (sortBy) {
        return list.slice(0).sort((a, b) => {
            let aDate: number, bDate: number;

            if (sortBy.startsWith('start')) {
                aDate = a.effectiveFrom.startsWith('20') ? new Date(a.effectiveFrom).getTime() : Infinity;
                bDate = b.effectiveFrom.startsWith('20') ? new Date(b.effectiveFrom).getTime() : Infinity;
            }
            else {
                aDate = a.effectiveTo.startsWith('20') ? new Date(a.effectiveTo).getTime() : Infinity;
                bDate = b.effectiveTo.startsWith('20') ? new Date(b.effectiveTo).getTime() : Infinity;
            }

            if (sortBy.endsWith('Asc')) return aDate - bDate;
            else return bDate - aDate;
        });
    }

    return list;
});
const store = useStore();

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

const sortOptions: SelectItem[] = Object.values({
    startAsc: {
        value: 'startAsc',
        text: 'Effective From (oldest)',
    },
    startDesc: {
        value: 'startDesc',
        text: 'Effective From (newest, default)',
    },
    endAsc: {
        value: 'endAsc',
        text: 'Effective To (oldest)',
    },
    endDesc: {
        value: 'endDesc',
        text: 'Effective To (newest)',
    },
} satisfies Record<NotamsSortBy, SelectItem>);

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
    display: flex;
    flex-direction: column;
    gap: 8px;

    &_info {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: center;

        margin-top: 16px;

        font-size: 14px;

        img {
            width: 56px;
        }
    }

    &__date, &__calendar {
        display: block;
        margin-bottom: 4px;
        font-size: 11px;
        line-height: 100%;
    }

    &__top {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    &__calendar {
        display: flex;
        gap: 4px;
        align-items: center;
        font-weight: bold;
    }

    &_notam {
        padding-top: 16px;
        border-top: 1px solid $darkgray875;
    }
}
</style>
