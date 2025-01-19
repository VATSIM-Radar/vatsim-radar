<template>
    <div class="table">
        <table>
            <thead>
                <tr>
                    <th
                        v-for="header in headers"
                        :key="header.key"
                        :style="header.style"
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
        </table>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';

export interface TableHeader<T = unknown> {
    key: string;
    name?: string;
    style?: CSSStyleDeclaration;
    /**
     * @default desc
     */
    sort?: boolean | 'asc' | 'desc' | ((a: T, b: T) => number);
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
});

defineSlots<HeaderSlot & DataSlot>();
type HeaderSlot = Record<`header${ string }`, (props: { header: TableHeader }) => any>;
type DataSlot = Record<`data${ string }`, (props: { header: TableHeader; data: any }) => any>;
</script>

<style scoped lang="scss">
.table {

}
</style>
