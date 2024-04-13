<template>
    <common-page-block class="roadmap">
        <template #title>
            Roadmap
        </template>
        <common-tabs class="roadmap_tabs" :tabs="roadmap" v-model="tab"/>
        <div class="roadmap_description" v-if="activeRoadmap.description">
            {{ activeRoadmap.description }}
        </div>

        <div class="roadmap_items" v-if="activeRoadmap.items.length">
            <common-info-block class="roadmap_items_item" v-for="item in activeRoadmap.items" :key="item">
                <template #bottom>
                    <div class="roadmap_items_item_text">
                        {{ item }}
                    </div>
                </template>
            </common-info-block>
        </div>
        <div class="roadmap_complete" v-else>
            All tasks on this stage were completed! 🎉
        </div>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/CommonPageBlock.vue';

interface Roadmap {
    title: string;
    description?: string;
    items: string[];
}

const tab = ref('stage2');

const roadmap: Record<string, Roadmap> = {
    developed: {
        title: '☑️ Developed',
        items: [
            'VatSPY FIRS/UIRS API',
            'Vatsim data caching',
            'Log in via Vatsim/Navigraph',
            'FIRS/UIRS on map',
            'Aircraft on map',
            'ATC on map',
            'Aircraft on ground counter',
            'Cyrillic decode',
            'Gates',
            'Settings',
        ],
    },
    stage1: {
        title: 'Stage 1',
        items: [],
    },
    stage2: {
        title: 'Stage 2',
        items: [
            'Map Modes (OpenStreetMaps/Satellite/Other)',
            'Light theme',
            'Different aircraft icons',
            'Layers (hide atc/aircraft/gates/etc)',
            'Filters (filter by aircraft/dep/arr/airport)',
            'Pilot/ATC/Airport info popup',
            'Open Source (code only)',
        ],
    },
    stage3: {
        title: 'Stage 3',
        items: [
            'Ability to run github repo locally',
            'Detailed route',
            'Waypoints on map',
            'Events',
            'Favorite pilots/ATC',
            'Friendly mobile version',
            'Aircraft moving in Vatsim update pause',
            'Search',
        ],
    },
    stage4: {
        title: 'Stage 4',
        items: [
            'Stats (popular now/over time)',
            'Detailed history routes (history of aircraft turns)',
            'PWA',
        ],
    },
    considering: {
        title: 'Considering',
        description: 'Those features may eventually come to some stage, but are still considered if they will be done at all',
        items: [
            'History of events',
            'Filter by events aircrafts',
            'Visualized events traffic',
            'CTAF frequency easy access',
            'Usage of VatGlasses data',
            'METAR easy access',
            'Google Play app',
            'Websockets instead of update requests',
            'Flight ETA',
            'Weather (still need to figure out from where to fetch)',
        ],
    },
};

const activeRoadmap = computed(() => roadmap[tab.value]);
</script>

<style scoped lang="scss">
.roadmap {
    &_tabs {
        margin-bottom: 16px;
    }

    &_description {
        font-weight: 700;
        background: $neutral1000;
        padding: 8px;
        border-radius: 4px;
        margin-bottom: 16px;
    }

    &_complete {
        background: $success500;
        color: $neutral150;
        padding: 8px;
        border-radius: 4px;
    }

    &_items {
        display: grid;
        grid-template-columns: repeat(2, calc(50% - 8px));
        gap: 16px;

        &_item_text {
            font-size: 16px;
        }
    }
}
</style>
