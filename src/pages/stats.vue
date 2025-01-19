<template>
    <div class="stats">
        <common-table
            :data="dataStore.vatsim.data.pilots.value"
            :headers="[{ key: 'cid', name: 'CID', sort: true }]"
            item-key="cid"
        />
    </div>
</template>

<script setup lang="ts">
import CommonTable from '~/components/common/basic/CommonTable.vue';

const dataStore = useDataStore();

await setupDataFetch();
</script>

<style scoped lang="scss">
.stats {

}
</style>
