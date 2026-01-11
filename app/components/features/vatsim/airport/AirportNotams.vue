<template>
    <div
        v-if="notamsList.length"
        class="__info-sections notams"
    >
        <ui-select
            :items="sortOptions"
            :model-value="store.localSettings.filters?.notamsSortBy ?? null"
            placeholder="Sort By"
            width="100%"
            @update:modelValue="setUserLocalSettings({ filters: { notamsSortBy: $event as any } })"
        />
        <ui-copy-info :text="notamsList.map(x => x.formattedText ?? x.text).join('\n\n')"/>
        <div
            v-for="({ title, items }) in notams"
            :key="title"
            class="notams_list"
        >
            <template v-if="items.length">
                <ui-block-title
                    class="notams_list_title"
                    remove-margin
                >
                    {{title}}
                </ui-block-title>
                <div
                    v-for="(notam, index) in items"
                    :key="index"
                    class="notams_notam"
                >
                    <ui-copy-info
                        auto-expand
                        :text="notam.text"
                    >
                        {{ notam.number }}
                        <template #prepend>
                            <ui-text-block :bottom-items="[notam.classification, getNotamType(notam.type)]">
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
                            </ui-text-block>
                        </template>
                    </ui-copy-info>
                </div>
            </template>
        </div>
        <div class="__partner-info notams__info">
            <div class="__partner-info_image">
                <img
                    alt="FAA"
                    src="../../../../assets/images/FAA-logo.svg"
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
import UiCopyInfo from '~/components/ui/text/UiCopyInfo.vue';
import UiTextBlock from '~/components/ui/text/UiTextBlock.vue';
import type { NotamsSortBy } from '~/types/map';
import type { SelectItem } from '~/types/components/select';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import { useStore } from '~/store';
import CalendarIcon from '~/assets/icons/kit/event.svg?component';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import type { VatsimAirportDataNotam } from '~/utils/backend/notams';

const data = injectAirport();
const notamsList = computed(() => {
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
const notams = computed(() => {
    const groups = {
        future: {
            title: 'Future',
            items: [],
        },
        sevd: {
            title: 'Last 7 days',
            items: [],
        },
        thrd: {
            title: 'Last 30 days',
            items: [],
        },
        old: {
            title: 'Older',
            items: [],
        },
    } as Record<'future' | 'sevd' | 'thrd' | 'old', {
        title: string;
        items: VatsimAirportDataNotam[];
    }>;

    const currentDate = Date.now();

    for (const notam of notamsList.value) {
        const date = new Date(notam.effectiveFrom);
        if (date.getTime() > currentDate) groups.future.items.push(notam);
        else if (currentDate - date.getTime() < 1000 * 60 * 60 * 24 * 7) groups.sevd.items.push(notam);
        else if (currentDate - date.getTime() < 1000 * 60 * 60 * 24 * 30) groups.thrd.items.push(notam);
        else groups.old.items.push(notam);
    }

    return groups;
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

<style lang="scss">
.airport_sections .notams_list_title{
    position: sticky;
    z-index: 2;
    top: 12px;

    padding: 8px 0;

    background: $darkgray900;
}
</style>

<style lang="scss" scoped>
.notams {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &__info {
        margin-top: 16px;
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

    &_list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &_notam{
        &:not(:nth-child(2)) {
            padding-top: 8px;
            border-top: 1px solid $darkgray850;
        }
    }
}
</style>
