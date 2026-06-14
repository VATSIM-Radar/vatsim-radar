<template>
    <ui-page-container>
        <div class="roadmap">
            <div class="roadmap_runway">
                <div class="roadmap_runway_start">
                    <roadmap-runway height="56"/>
                </div>
                <div class="roadmap_runway_digits">
                    06
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
            <ui-notification type="info">
                All considering issues are available on <a
                    class="__link"
                    href="https://github.com/VATSIM-Radar/vatsim-radar/issues"
                    target="_blank"
                >Github</a>
            </ui-notification>
            <br>
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
                                                Planned for short-term
                                            </template>
                                            <template v-else-if="group.status === 'in-progress'">
                                                In progress
                                            </template>
                                            <template v-else-if="group.status === 'tentative'">
                                                Considering
                                            </template>
                                            <template v-else-if="group.status === 'next'">
                                                Done in Next
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
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import RoadmapRunway from 'assets/icons/roadmap/roadmap-runway.svg?component';
import RoadmapAircraft from 'assets/icons/roadmap/roadmap-aircraft.svg?component';
import UiNotification from '~/components/ui/data/UiNotification.vue';

type ItemStatus = 'todo' | 'in-progress' | 'completed' | 'next' | 'none' | 'tentative';

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
        title: 'Released',
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
            {
                title: 'Arrivals rate',
                status: 'completed',
            },
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
                title: 'Settings (hide controllers/aircraft/gates/etc)',
                status: 'completed',
            },
            {
                title: 'Filters (filter by aircraft/dep/arr/airport)',
                status: 'completed',
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
            {
                title: 'Favorite pilots/ATC',
                status: 'completed',
            },
            {
                title: 'Search',
                status: 'completed',
            },
            {
                title: 'Friendly mobile version',
                status: 'completed',
            },
            {
                title: 'Pilot/airport mouse context menu',
                status: 'completed',
            },
            {
                title: 'Oceanic Tracks integration',
                status: 'completed',
            },
            {
                title: 'Smart positioning for aircraft info popup',
                status: 'completed',
            },
            {
                title: 'Select/Interaction/Render rework',
                status: 'completed',
            },
            {
                title: 'Infinite Map',
                status: 'completed',
            },
            {
                title: 'Waypoints, airways, CIDs, STARs, VORDME, holdings',
                status: 'completed',
            },
            {
                title: 'Waypoints on map (including aircraft submitted route)',
                status: 'completed',
            },
            {
                title: 'Friends export/import',
                description: 'Including VATSpy-like import',
                status: 'completed',
            },
            {
                title: 'ATC Bookings',
                status: 'completed',
            },
            {
                title: 'SIGMETs/AIRMETs',
                status: 'completed',
            },
            {
                title: 'Basic Stats',
                description: 'Popular now etc',
                status: 'completed',
            },
            {
                title: 'PWA',
                status: 'completed',
            },
            {
                title: 'Usage of VatGlasses data',
                status: 'completed',
            },
            {
                title: 'Bookmarks',
                status: 'completed',
            },
            {
                title: 'Name of aircraft operating company',
                status: 'completed',
            },
            {
                title: 'Distance measuring tool',
                status: 'completed',
            },
            {
                title: 'Day/Night line',
                status: 'completed',
            },
            {
                title: 'NOTAMs grouping',
                status: 'completed',
            },
            {
                title: 'METAR request',
                status: 'completed',
            },
            {
                title: 'Settings Page',
                status: 'completed',
            },
            {
                title: 'Image of aircraft type',
                status: 'completed',
            },
            { title: 'Friends list UX improvements', status: 'completed' },
            { title: 'Filters UX improvements', status: 'completed' },
            {
                title: 'Events/ATC Bookings 2.0',
                description: 'Events on map, improved bookings display',
                status: 'completed',
            },
            {
                title: 'Takeoff and arrival actual time',
                status: 'completed',
            },
            {
                title: 'Images or aircraft type, airline + operator',
                status: 'completed',
            },
        ],
    },
    {
        title: 'v2.1',
        items: [
            {
                title: 'Historical Stats',
                description: 'Popular over time etc',
            },
            { title: 'Desktop Application', status: 'tentative' },
            { title: 'Theme Market', status: 'tentative' },
            { title: 'Flights/controllers sessions history, VATSIM user page' },
            { title: 'History of events / events traffic' },
        ],
    },
    {
        title: 'v2.x',
        items: [
            { title: 'ATC Alerts', status: 'tentative' },
            { title: 'Events Alerts', status: 'tentative' },
            { title: 'PIREPs', status: 'tentative' },
        ],
    },
]);

const percents = 60;

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
        'in-progress': 0,
        todo: 1,
        next: 2,
        tentative: 3,
        none: 4,
        completed: 5,
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
        border-radius: 8px;

        background: $darkGray700;

        &::before {
            content: '';

            position: absolute;
            left: 8%;

            width: 92%;
            height: 1px;

            background-image: linear-gradient(to right, $darkGray400 33%, rgb(255, 255, 255, 0) 0%);
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
                border-radius: 100%;

                background: $lightGray300;
            }

            &--status-in-progress::before {
                background: $blue500
            }

            &--status-tentative::before {
                background: $citrus500
            }

            &--status-completed::before {
                background: $green500;
            }
        }

        &_aircraft {
            left: var(--percents);
            color: $lightGray500;
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
                stroke: $darkGray800;
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

        @include mobile {
            padding: 16px 0;
            border-radius: 16px;
            background: $darkGray700;
        }

        &_title {
            margin-bottom: 16px;
            font-size: 24px;
            font-weight: 700;
            text-align: center;
        }

        &--status-in-progress .roadmap__col_title {
            color: $blue500
        }

        &--status-completed .roadmap__col_title {
            color: $green500;
        }
    }

    &__item {
        padding: 16px;
        border-radius: 16px;
        background: $darkGray700;

        &_description {
            margin-bottom: 16px;
            font-size: 11px;
            color: $lightGray500;
        }

        &_groups {
            overflow: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;

            max-height: 65vh;

            @include mobile {
                max-height: 20vh;
            }

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

                        background: $darkGray500;
                    }

                    &_counter {
                        position: relative;

                        margin-left: 8px;
                        padding: 0 8px;
                        border-radius: 2px;

                        font-size: 11px;
                        font-weight: 600;

                        background: $darkGray500;
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
        border-radius: 8px;

        font-size: 13px;

        background: $darkGray600;

        &_title {
            font-weight: 600;
        }

        &_status {
            color: var(--status-color);
        }

        &--status-todo {
            --status-color: #{$orange600};
        }

        &--status-in-progress {
            --status-color: #{$blue500};
        }

        &--status-tentative {
            --status-color: #{$citrus500};
        }

        &--status-next {
            --status-color: #{$purple500};
        }

        &--status-completed {
            --status-color: #{$green500};
        }
    }

    &_cols {
        @include mobileOnly {
            flex-direction: column;
            gap: 8px;
        }

        @include tablet {
            display: grid;
            grid-template-columns: repeat(2, calc(50% - 8px));

            > *:last-child {
                grid-column: span 2;
            }
        }
    }
}
</style>
