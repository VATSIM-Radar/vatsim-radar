<template>
    <ui-page-container>
        <template #title>
            Chips
        </template>

        <client-only>
            <div class="items">
                <ui-chip model-value>
                    <template #prepend>
                        <discord-icon width="12"/>
                    </template>
                    test
                    <template #append>
                        <discord-icon width="12"/>
                    </template>
                </ui-chip>
                <ui-chip variant="accent">
                    test
                </ui-chip>
                <ui-chip
                    v-for="facility in facilitiesIds"
                    :key="facility"
                    :atc-facility="facility"
                >
                    <template #prepend>
                        <discord-icon width="12"/>
                    </template>

                    <template #append>
                        <discord-icon width="12"/>
                    </template>
                </ui-chip>
                <ui-chip
                    v-for="facility in facilitiesIds"
                    :key="facility"
                    :atc-facility="facility"
                    atc-small-icon
                />
                <ui-chip
                    :time="date"
                    time-variant="time"
                />
                <ui-chip :time="date"/>
                <ui-chip
                    :time="date"
                    time-variant="timeSecondsZ"
                />
            </div>
        </client-only>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import DiscordIcon from 'assets/icons/header/discord.svg?component';
import UiChip from '~/components/ui/text/UiChip.vue';
import type { VatsimLiveData } from '~/types/data/vatsim';
import { useFacilitiesIds } from '~/composables/vatsim/controllers';

const dataStore = useDataStore();
const date = new Date();
const facilitiesIds = computed(() => useFacilitiesIds());

await useAsyncData(async () => {
    const data = await $fetch<VatsimLiveData>(`/api/data/vatsim/data`, {
        timeout: 1000 * 60,
    });
    dataStore.vatsim.data.facilities.value = data.facilities;
}, {
    server: false,
});
</script>

<style lang="scss" scoped>
.items {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
}
</style>
