<template>
    <common-page-block class="roadmap">
        <template #title>
            Roadmap
        </template>
        <div class="roadmap_tabs">
            <div
                class="roadmap_item"
                :class="{
                    'roadmap_item--completed': item.completed,
                    'roadmap_item--opened': item.opened,
                    'roadmap_item--active': item.items.some(x => typeof x === 'object' && x.status),
                }"
                v-for="(item, index) in roadmap"
                :key="index"
                @click="!item.opened ? [activeRoadmap ? activeRoadmap.opened = false : undefined, item.opened = true] : undefined"
            >
                <div class="roadmap_item_title">
                    {{ item.title }}
                </div>
                <div class="roadmap_item_description" v-if="item.description && item.opened">
                    {{ item.description }}
                </div>
                <div class="roadmap_item_items" v-if="item.opened">
                    <common-info-block class="roadmap_item_items_block" :top-items="typeof block === 'string' ? [block] : [block.title, block.description]" v-for="(block, blockIndex) in item.items" :key="blockIndex">
                        <template #bottom v-if="(typeof block === 'object' && block.status) || item.completed">
                            <div class="roadmap_item_items__status" :class="[`roadmap_item_items__status--${item.completed ? 'completed' : (block as Record<string, any>).status}`]">
                                <template v-if="typeof block === 'object' && block.status">
                                    <template v-if="block.status === 'todo'">
                                        TODO
                                    </template>
                                    <template v-else-if="block.status === 'in-progress'">
                                        In progress
                                    </template>
                                    <template v-else-if="block.status === 'completed'">
                                        Completed
                                    </template>
                                </template>
                                <template v-else-if="item.completed">
                                    Completed
                                </template>
                            </div>
                        </template>
                    </common-info-block>
                </div>
            </div>
        </div>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/CommonPageBlock.vue';

interface Roadmap {
    title: string;
    description?: string;
    items: Array<string | { title: string, description?: string, status?: 'todo' | 'in-progress' | 'completed' }>;
    completed?: boolean;
    opened?: boolean;
}

const roadmap = reactive<Roadmap[]>([
    {
        title: 'Stage 1',
        completed: true,
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
    {
        title: 'Stage 2',
        opened: true,
        items: [
            {
                title: 'Aircraft tracking',
                status: 'in-progress',
            },
            {
                title: 'Aircraft info popup',
                status: 'in-progress',
            },
            {
                title: 'ATC info popup',
                status: 'todo',
            },
            {
                title: 'Airport info popup',
                status: 'todo',
            },
            'Map Modes (OpenStreetMaps/Satellite/Other)',
            'Light theme',
            'Different aircraft icons',
            'Layers (hide atc/aircraft/gates/etc)',
            'Filters (filter by aircraft/dep/arr/airport)',
            'Open Source (code only)',
        ],
    },
    {
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
    {
        title: 'Stage 4',
        items: [
            'Stats (popular now/over time)',
            'Detailed history routes (history of aircraft turns)',
            'PWA',
            'OSS development support',
        ],
    },
    {
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
            'Simbrief integration',
        ],
    },
]);

const activeRoadmap = computed(() => roadmap.find(x => x.opened));
</script>

<style scoped lang="scss">
.roadmap {
    &_tabs {
        display: flex;
        justify-content: space-between;
    }

    &_item {
        background: $neutral1000;
        width: calc(25% / 4 - 8px);
        padding: 8px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        transition: 0.3s;
        white-space: nowrap;
        overflow: hidden;

        &_title {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
            font-size: 32px;
            font-family: $openSansFont;
            font-weight: 700;
            color: $neutral150;
            margin-bottom: 8px;
        }

        &--active .roadmap_item_title {
            color: $primary500;
        }

        &--completed .roadmap_item_title {
            color: $success500;
        }

        &--opened {
            width: 75%;
            cursor: default;

            .roadmap_item {
                &_title {
                    writing-mode: initial;
                    transform: rotate(0deg);
                }
            }
        }

        &_items {
            display: grid;
            grid-template-columns: repeat(2, calc(50% - 4px));
            gap: 8px;

            & &_block {
                font-size: 14px;
            }

            &__status {
                &--todo {
                    color: $warning500;
                }

                &--in-progress {
                    color: $primary500;
                }

                &--completed {
                    color: $success500;
                }
            }
        }
    }
}
</style>
