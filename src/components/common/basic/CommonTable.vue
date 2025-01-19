<template>
    <div class="table">
        <table>
            <thead>
                <tr>
                    <th
                        v-for="header in headers"
                        :key="header.key"
                        v-bind="header.headAttributes"
                        @click="doSort(header)"
                    >
                        <slot
                            :header="header"
                            :name="`header${ header.key }`"
                        >
                            {{ header.name }}
                        </slot>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="item in items"
                    :key="String(item[itemKey])"
                >
                    <th
                        v-for="header in headers"
                        :key="`${ String(item[itemKey]) }-${ header.key }`"
                        v-bind="header.dataAttributes ?? header.headAttributes"
                    >
                        <slot
                            :data="item[header.key]"
                            :header="header"
                            :name="`data${ header.key }`"
                        >
                            {{ item[header.key] }}
                        </slot>
                    </th>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

export interface TableHeader<T = unknown> {
    key: string;
    name?: string;
    sort?: boolean | ((a: T, b: T, algo: 'asc' | 'desc') => number);
    headAttributes?: Record<string, any>;
    dataAttributes?: Record<string, any>;
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
});

defineSlots<HeaderSlot & DataSlot>();
type HeaderSlot = Record<`header${ string }`, (props: { header: TableHeader }) => any>;
type DataSlot = Record<`data${ string }`, (props: { header: TableHeader; data: any }) => any>;

const sorting = ref<{ key: string; algo: 'asc' | 'desc' }[]>([]);

const items = computed(() => {
    if (!sorting.value.length) return props.data;

    const headersByKey = Object.fromEntries(props.headers.map(x => [x.key, x]));

    return props.data.slice(0).sort((a, b) => {
        for (const sort of sorting.value) {
            const header = headersByKey[sort.key];
            const aData = a[sort.key];
            const bData = b[sort.key];

            if (!header || (typeof header.sort !== 'function' && (
                (typeof aData !== 'string' && typeof aData !== 'number') || (typeof bData !== 'string' && typeof bData !== 'number'))
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
        }

        return 0;
    });
});

function doSort(header: TableHeader) {
    const existingSort = sorting.value.find(x => x.key === header.key);
    if (existingSort) {
        if (existingSort.algo === 'asc') sorting.value = sorting.value.filter(x => x.key !== header.key);
        else existingSort.algo = 'asc';
    }
    else sorting.value.push({ key: header.key, algo: 'desc' });
}
</script>

<style scoped lang="scss">
.table {

}
</style>
