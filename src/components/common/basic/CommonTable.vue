<template>
    <div class="table-wrapper">
        <div class="table">
            <div class="table_header">
                <div class="table__row">
                    <div
                        v-for="header in headers"
                        :key="header.key"
                        class="table__data"
                        v-bind="header.headAttributes"
                        @click="doSort(header)"
                    >
                        <div class="table_header__data">
                            <slot
                                :header="header"
                                :name="`header-${ header.key }`"
                            >
                                {{ header.name }}
                            </slot>
                        </div>
                        <div
                            v-if="header.sort"
                            class="table_header__sort"
                            :class="{
                                'table_header__sort--active': sorting.some(x => x.key === header.key),
                                'table_header__sort--desc': sorting.some(x => x.key === header.key && x.algo === 'desc'),
                            }"
                        >
                            <sort-icon/>
                        </div>
                    </div>
                </div>
            </div>
            <div class="table_data">
                <div
                    v-for="(item, index) in items"
                    :key="String(item[itemKey])"
                    class="table__row"
                    :class="{ 'table__row--clickable': clickable }"
                    @click="$emit('click', item)"
                >
                    <div
                        v-for="header in headers"
                        :key="`${ String(item[itemKey]) }-${ header.key }`"
                        class="table__data"
                        :class="[`table__data--type-${ header.key }`]"
                        v-bind="header.dataAttributes ?? header.headAttributes"
                    >
                        <slot
                            :data="item[header.key]"
                            :header="header"
                            :index="index"
                            :item="item"
                            :name="`data-${ header.key }`"
                        >
                            {{ item[header.key] }}
                        </slot>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import SortIcon from '@/assets/icons/kit/sort.svg?component';

export interface TableHeader<T = unknown> {
    key: string;
    name?: string;
    sort?: boolean | ((a: T, b: T, algo: 'asc' | 'desc') => number);
    headAttributes?: Record<string, any>;
    dataAttributes?: Record<string, any>;
    width?: number | string;
}

const props = defineProps({
    headers: {
        type: Object as PropType<TableHeader[]>,
        required: true,
    },
    data: {
        type: Array as PropType<Record<string, any>[]>,
        required: true,
    },
    itemKey: {
        type: String,
        required: true,
    },
    clickable: {
        type: Boolean,
        default: false,
    },
    mobileWidth: {
        type: String,
        default: '1000px',
    },
});

defineEmits({
    click(item: any) {
        return true;
    },
});
defineSlots<HeaderSlot & DataSlot>();
type HeaderSlot = Record<`header${ string }`, (props: { header: TableHeader }) => any>;
type DataSlot = Record<`data${ string }`, (props: { header: TableHeader; data: any; item: any; index: number }) => any>;

export interface TableSort {
    key: string; algo: 'asc' | 'desc';
}

const sorting = defineModel<TableSort[]>('sort', { default: () => reactive([]) });

const templateColumns = computed(() => {
    return props.headers.map(x => typeof x.width === 'number' ? `${ x.width }px` : x.width || '1fr').join(' ');
});

const items = computed(() => {
    if (!sorting.value.length) return props.data;

    const headersByKey = Object.fromEntries(props.headers.map(x => [x.key, x]));

    return props.data.slice(0).sort((a, b) => {
        for (const sort of sorting.value) {
            const header = headersByKey[sort.key];
            const aData = a[sort.key];
            const bData = b[sort.key];

            if (!header || (typeof header.sort !== 'function' && (
                (typeof aData !== 'string' && typeof aData !== 'number' && typeof aData !== 'boolean') || (typeof bData !== 'string' && typeof bData !== 'number' && typeof bData !== 'boolean'))
            )) continue;

            if (typeof header.sort === 'function') {
                const result = header.sort(a, b, sort.algo);
                if (result === 0) continue;
                return result;
            }

            if (typeof aData === 'string' && typeof bData === 'string') {
                const result = sort.algo === 'asc' ? aData.localeCompare(bData, undefined, { numeric: true }) : bData.localeCompare(aData, undefined, { numeric: true });
                if (result === 0) continue;
                return result;
            }

            if (typeof aData === 'number' && typeof bData === 'number') {
                const result = sort.algo === 'asc' ? aData - bData : bData - aData;
                if (result === 0) continue;
                return result;
            }

            if (typeof aData === 'boolean' && typeof bData === 'boolean') {
                const result = sort.algo === 'asc' ? Number(aData) - Number(bData) : Number(bData) - Number(aData);
                if (result === 0) continue;
                return result;
            }
        }

        return 0;
    });
});

function doSort(header: TableHeader) {
    const existingSort = sorting.value.find(x => x.key === header.key);
    if (existingSort) {
        if (existingSort.algo === 'desc') sorting.value = reactive(toRaw(sorting.value.filter(x => x.key !== header.key)));
        else existingSort.algo = 'desc';
    }
    else sorting.value.push({ key: header.key, algo: 'asc' });
}
</script>

<style scoped lang="scss">
.table {
    padding: 16px;
    border-radius: 16px;
    color: $lightgray100;
    background: $darkgray900;

    &__row {
        display: grid;
        grid-auto-columns: auto;
        grid-template-columns: v-bind(templateColumns);
        gap: 16px;
        align-items: center;

        padding: 16px;
    }

    &_header {
        user-select: none;

        position: sticky;
        top: 56px;

        margin-bottom: 16px;
        border-bottom: 1px solid $darkgray850;

        font-size: 14px;
        line-height: 100%;

        background: $darkgray900;

        .table {
            &__data {
                display: flex;
                gap: 8px;
                align-items: center;
            }
        }

        &__sort {
            cursor: pointer;

            transform: scale(1, -1);

            display: flex;
            align-items: center;
            justify-content: center;

            width: 18px;
            min-width: 18px;

            transition: 0.3s;

            @include hover {
                &:hover {
                    color: $primary300;
                }
            }

            &--active {
                color: $primary400;
            }

            &--desc {
                transform: scale(1, 1);
            }

            svg {
                width: 16px;
            }
        }
    }

    &_data {
        display: flex;
        flex-direction: column;
        gap: 16px;

        font-size: 13px;
        line-height: 100%;

        .table {
            &__row {
                border-radius: 8px;
                background: $darkgray850;

                &--clickable {
                    cursor: pointer;

                    @include hover {
                        transition: 0.3s;

                        &:hover {
                            background: $darkgray800;
                        }
                    }
                }
            }
        }
    }
}

@media all and (max-width: 1000px) {
    .table-wrapper {
        overflow: auto;
        max-width: 100%;
        border-radius: 16px;

        .table {
            width: v-bind(mobileWidth);

            &_header {
                top: 0;
            }
        }
    }
}
</style>
