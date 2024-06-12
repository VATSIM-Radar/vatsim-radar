<template>
    <common-page-block>
        <div class="roadmap">
            <div class="roadmap_runway">
                <div class="roadmap_runway_start">
                    <roadmap-runway height="56"/>
                </div>
                <div class="roadmap_runway_digits">
                    {{ percents }}
                </div>
                <div class="roadmap_runway_cols">
                    <div
                        v-for="col in roadmap"
                        :key="col.title"
                        class="roadmap_runway_col"
                        :class="{
                            'roadmap_runway_col--status-completed': col.completed,
                            'roadmap_runway_col--status-in-progress': col.items.some(x => typeof x === 'object' && (x.status === 'in-progress' || x.status === 'completed')),
                        }"
                    />
                </div>
                <div
                    class="roadmap_runway_aircraft"
                    :style="{ '--percents': `${ percents }%` }"
                >
                    <roadmap-aircraft height="32"/>
                </div>
            </div>
            <div class="roadmap_cols">
                <div
                    v-for="col in roadmap"
                    :key="col.title"
                    class="roadmap__col"
                    :class="{
                        'roadmap__col--status-completed': col.completed,
                        'roadmap__col--status-in-progress': col.items.some(x => typeof x === 'object' && (x.status === 'in-progress' || x.status === 'completed')),
                    }"
                >
                    <div class="roadmap__col_title">
                        {{ col.title }}
                    </div>
                    <div class="roadmap__item">
                        <div
                            v-if="col.description"
                            class="roadmap__item_description"
                        >
                            {{ col.description }}
                        </div>
                        <div class="roadmap__item_groups">
                            <div
                                v-for="group in getRoadmapGroups(col.items, col.completed)"
                                :key="group.status"
                                class="roadmap__item_groups_group"
                            >
                                <div class="roadmap__item_groups_group_title">
                                    <div class="roadmap__item_groups_group_title_counter">
                                        {{ group.items.length }}
                                    </div>
                                </div>
                                <div class="roadmap__item_groups_group_items">
                                    <div
                                        v-for="(item, index) in group.items"
                                        :key="index"
                                        class="roadmap__task"
                                        :class="[`roadmap__task--status-${ group.status }`]"
                                    >
                                        <div class="roadmap__task_title">
                                            {{ typeof item === 'string' ? item : item.title }}
                                        </div>
                                        <div
                                            v-if="typeof item === 'object' && item.description"
                                            class="roadmap__task_description"
                                        >
                                            {{ item.description }}
                                        </div>
                                        <div
                                            v-if="group.status !== 'none'"
                                            class="roadmap__task_status"
                                        >
                                            <template v-if="group.status === 'todo'">
                                                Planned
                                            </template>
                                            <template v-else-if="group.status === 'in-progress'">
                                                In progress
                                            </template>
                                            <template v-else-if="group.status === 'completed'">
                                                Completed
                                            </template>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import RoadmapRunway from 'assets/icons/roadmap/roadmap-runway.svg?component';
import RoadmapAircraft from 'assets/icons/roadmap/roadmap-aircraft.svg?component';

type ItemStatus = 'todo' | 'in-progress' | 'completed' | 'none';

interface Item {
    title: string;
    description?: string;
    status?: ItemStatus;
}

interface Roadmap {
    title: string;
    description?: string;
    items: Array<string | Item>;
    completed?: boolean;
}

useHead({
    title: 'Roadmap',
});

const roadmap = reactive<Roadmap[]>([
    {
        title: 'Stage 1',
        completed: true,
        items: [
            'VatSPY FIRS/UIRS API',
            'VATSIM data caching',
            'Log in via VATSIM/Navigraph',
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
        items: [
            {
                title: 'Aircraft tracking',
                description: 'Including center/zoom to it, any random aicraft on map',
                status: 'completed',
            },
            {
                title: 'Aircraft info popup',
                status: 'completed',
            },
            {
                title: 'Flight ETA',
                status: 'completed',
            },
            {
                title: 'Different aircraft icons',
                description: 'Initial release with few icons',
                status: 'completed',
            },
            {
                title: 'Auto track/zoom for own flight',
                status: 'completed',
            },
            {
                title: 'Pilot/airport mouse right click menu',
            },
            {
                title: 'TMA approach sectors',
                status: 'completed',
            },
            {
                title: 'Center/zoom to entire flight button',
                status: 'completed',
            },
            {
                title: 'Center/zoom to airport button',
                status: 'completed',
            },
            {
                title: '"Recolor/show tracks for aircraft" setting if they have same arrival airport as you',
                description: 'Will be available for aircraft arriving to same airport as you / arriving to selected airport',
                status: 'completed',
            },
            {
                title: 'Airport dashboard',
                description: 'Separate dashboard that allows to view much more information on screen',
                status: 'completed',
            },
            {
                title: 'ATC info popup',
                status: 'completed',
            },
            {
                title: 'Airport info popup',
                status: 'completed',
            },
            {
                title: 'CTAF frequency easy access',
                status: 'completed',
            },
            {
                title: 'METAR/TAFs/NOTAMs easy access',
                status: 'completed',
            },
            {
                title: 'Map Modes (OpenStreetMaps/Satellite/Other)',
                status: 'completed',
            },
            {
                title: 'Light theme',
                status: 'completed',
            },
            {
                title: 'Easy access to pilot stats in airport popup',
                description: 'View pilots stats directly in airport popup to determine how new they are',
                status: 'completed',
            },
            {
                title: 'Layers (hide atc/aircraft/gates/etc)',
                status: 'todo',
            },
            {
                title: 'Filters (filter by aircraft/dep/arr/airport)',
                status: 'todo',
            },
            {
                title: 'Open Source (code only)',
                status: 'completed',
            },
            {
                title: 'Detailed history routes',
                description: 'History of aircraft turns',
                status: 'completed',
            },
            {
                title: 'Weather radar',
                status: 'completed',
            },
            {
                title: 'Airport Dashboard Controller Mode',
                status: 'completed',
            },
        ],
    },
    {
        title: 'Stage 3',
        items: [
            'Ability to run github repo locally',
            'Oceanic Tracks integration',
            'Waypoints on map (including aircraft submitted route)',
            'Events/ATC Bookings',
            'Favorite pilots/ATC',
            'Friendly mobile version',
            'Search',
            'Usage of VatGlasses data',
            {
                title: 'Basic Stats',
                description: 'Popular now etc',
            },
            'Hoppie integration',
            {
                title: 'PWA',
                description: 'Basically PC version of VATSIM Radar',
            },
        ],
    },
    {
        title: 'Stage 4',
        items: [
            {
                title: 'Detailed Stats',
                description: 'Popular over time etc',
            },
            'Name of aircraft operating company',
            'Images or aircraft type + operator',
            'Aircraft moving in VATSIM update pause',
            'Flights/atc sessions history, VATSIM user page',
            'History of events / events traffic',
        ],
    },
    {
        title: 'Considering',
        description: 'Those features may eventually come to some stage, but are still considered if they will be done at all',
        items: [
            'Google Play app',
            'Websockets instead of update requests',
            'Simbrief integration',
            'ATC/Booking notification for active flight',
            'ECFMP integration',
            'Streamers integration',
            '3D map view',
            {
                title: 'Move overlays across the map',
                description: 'This was moved to "considering" from "Stage 2" because of mixed feedback and high development cost',
            },
            {
                title: 'Gates status in airport popup/dashboard',
                description: 'It is to be decided do we really need this and where specifically',
            },
        ],
    },
]);

const percents = 47;

interface RoadmapGroup {
    status: ItemStatus;
    items: Array<Item | string>;
}

function getRoadmapGroups(items: Array<string | Item>, isCompleted = false): RoadmapGroup[] {
    const groups: RoadmapGroup[] = [];

    for (const item of items) {
        let status = (typeof item === 'object' && item.status) ? item.status : 'none';
        if (isCompleted) status = 'completed';

        const existingGroup = groups.find(x => x.status === status);
        if (!existingGroup) {
            groups.push({
                status,
                items: [item],
            });
            continue;
        }

        existingGroup.items.push(item);
    }

    const statuses: Record<ItemStatus, number> = {
        'in-progress': 1,
        todo: 2,
        none: 3,
        completed: 4,
    };

    return groups.sort((a, b) => {
        return statuses[a.status] - statuses[b.status];
    });
}
</script>

<style scoped lang="scss">
.roadmap {
    &_runway {
        position: relative;

        display: flex;
        align-items: center;

        height: 56px;
        margin-bottom: 48px;

        background: $darkgray900;
        border-radius: 8px;

        &::before {
            content: '';

            position: absolute;
            left: 8%;

            width: 92%;
            height: 1px;

            background-image: linear-gradient(to right, $darkgray800 33%, rgba(255, 255, 255, 0) 0%);
            background-repeat: repeat-x;
            background-position: bottom;
            background-size: 25px 1px;
        }

        > * {
            position: absolute;
            z-index: 1;
        }

        &_start {
            left: 1.7%;
        }

        &_digits {
            left: 5%;

            writing-mode: vertical-lr;
            font-size: 12px;
            font-weight: 300;
            text-orientation: mixed;
        }

        &_cols {
            width: 100%;
        }

        &_col {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;

            &::before {
                content: '';

                position: absolute;

                width: 8px;
                height: 8px;

                background: $lightgray100;
                border-radius: 100%;
            }

            &--status-completed::before {
                background: $success500;
            }

            &--status-in-progress::before {
                background: $primary500
            }
        }

        &_aircraft {
            left: var(--percents);
            color: $lightgray150;
            animation: move 5s cubic-bezier(.85, .02, .47, .98);

            @keyframes move {
                0% {
                    left: 0;
                }

                100% {
                    left: var(--percents);
                }
            }

            svg :deep(path) {
                stroke: $darkgray950;
            }
        }
    }

    &_cols, .roadmap_runway_cols {
        display: flex;
        gap: 16px;
        align-items: flex-start;
    }

    &__col {
        width: 100%;

        &_title {
            margin-bottom: 16px;

            font-family: $openSansFont;
            font-size: 24px;
            font-weight: 700;
            text-align: center;
        }

        &--status-completed .roadmap__col_title {
            color: $success500;
        }

        &--status-in-progress .roadmap__col_title {
            color: $primary500
        }
    }

    &__item {
        padding: 16px;
        background: $darkgray900;
        border-radius: 16px;

        &_description {
            margin-bottom: 16px;
            font-size: 11px;
            color: $lightgray150;
        }

        &_groups {
            overflow: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;

            max-height: 65vh;

            &_group {
                &_title {
                    position: relative;
                    display: flex;
                    margin-bottom: 16px;

                    &::before {
                        content: '';

                        position: absolute;

                        align-self: center;

                        width: 100%;
                        height: 1px;

                        background: $darkgray850;
                    }

                    &_counter {
                        position: relative;

                        margin-left: 8px;
                        padding: 0 8px;

                        font-size: 11px;
                        font-weight: 600;

                        background: $darkgray850;
                        border-radius: 2px;
                    }
                }

                &_items {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
            }
        }
    }

    &__task {
        display: flex;
        flex-direction: column;
        gap: 8px;

        padding: 8px;

        font-size: 13px;

        background: $darkgray875;
        border-radius: 8px;

        &_title {
            font-weight: 600;
        }

        &_status {
            color: var(--status-color);
        }

        &--status-todo {
            --status-color: #{$warning600};
        }

        &--status-in-progress {
            --status-color: #{$primary500};
        }

        &--status-completed {
            --status-color: #{$success500};
        }
    }
}
</style>
