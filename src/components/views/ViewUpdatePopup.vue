<template>
    <common-popup
        v-if="!store.config.hideHeader"
        :model-value="show"
        @update:modelValue="close"
    >
        <template #title>
            <div class="update_title">
                <span>
                    <template v-if="update.type === 'major'">
                        Major
                    </template>
                    <template v-else>
                        Minor
                    </template>
                    update {{ update.name }}
                </span>
                is now available
            </div>
        </template>

        <div
            class="update_feature"
            :style="{ '--height': update.height }"
        >
            <div class="update_feature_title">
                {{ shownFeature.title }}
            </div>
            <div
                v-if="shownFeature.image"
                class="update_feature_image"
                :style="{ backgroundImage: `url(${ shownFeature.image })` }"
            />
            <div class="update_feature_text">
                <div
                    v-if="shownFeature.description"
                    class="update_feature_text_description"
                    v-html="shownFeature.description"
                />
                <ul
                    v-if="shownFeature.list"
                    class="update_feature_text_list"
                >
                    <li
                        v-for="item in shownFeature.list"
                        :key="item"
                        v-html="item"
                    />
                </ul>
            </div>
            <div class="__spacer"/>
            <div class="update_feature_navigation">
                <div
                    class="update_feature_navigation_arrow update_feature_navigation_arrow--left"
                    :class="{ 'update_feature_navigation_arrow--disabled': shownFeatureIndex === 0 }"
                    @click="shownFeatureIndex--"
                >
                    <arrow-top-icon/>
                </div>
                <div class="update_feature_navigation_dots">
                    <div
                        v-for="(_, index) in update.features"
                        :key="index"
                        class="update_feature_navigation_dots_dot"
                        :class="{ 'update_feature_navigation_dots_dot--active': index === shownFeatureIndex }"
                        @click="shownFeatureIndex = index"
                    />
                </div>
                <div
                    class="update_feature_navigation_arrow update_feature_navigation_arrow--right"
                    :class="{ 'update_feature_navigation_arrow--disabled': shownFeatureIndex === update.features.length - 1 }"
                    @click="shownFeatureIndex++"
                >
                    <arrow-top-icon/>
                </div>
            </div>
        </div>
    </common-popup>
</template>

<script setup lang="ts">
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import { useStore } from '~/store';

interface UpdateFeature {
    title: string;
    image?: any;
    description?: string;
    list?: string[];
}

interface Update {
    type: 'minor' | 'major';
    name: string;
    height?: string;
    features: UpdateFeature[];
}

const store = useStore();
const images = import.meta.glob('../../assets/update/*.png', { import: 'default', eager: true });

const update: Update = {
    type: 'minor',
    name: '0.4.4',
    height: '500px',
    features: [
        {
            title: 'Featured Airports',
            image: images['../../assets/update/airports.png'],
            description: 'Introducing 0.4.4, our QoL-focused update!<br><br>' +
                'It took a bit longer to develop it than we thought, but we have fixed more than 30 community-reported issues and requested features.<br><br>' +
                `Let's start with Featured Airports!`,
            list: [
                'View most popular airports, sorted by traffic',
                'View most quiet, yet staffed airports: take first flights, find interesting airports, or support controller(s) on this position',
                'Filter airports by visible to easily find those in area you want',
                'Switch between ground and total departures to get a quick look at airport traffic',
            ],
        },
        {
            title: 'Aircraft Icons',
            image: images['../../assets/update/aircraft.png'],
            list: [
                'Icons were added for Cessnas, Airbus, BALLs, fighters, and many other types!',
                'Thanks to DotWallop for this contribution',
            ],
        },
        {
            title: 'Airport Arrival Rate',
            image: images['../../assets/update/arrival.png'],
            list: [
                'We now show estimated Arrival Rate for airports!',
                'This is shown in Airport Dashboard and Airport Overlay (via arrival counter hover)',
                'While this is not precise number, it may still help controllers to measure incoming airport load',
                'Thanks to Felix for this contribution',
            ],
        },
        {
            title: 'Quality of Life',
            description: 'We have made so many changes this update... Come visit our Discord for full changelog: https://vatsim-radar.com/discord',
            image: images['../../assets/update/quality.png'],
            list: [
                'UI improvements with partial redesigns',
                '?pilot link now also supports callsign, not only CID',
                'New tracks colors, adapted for both light and dark themes',
                'New stepclimbs display with kilometers support',
                'TRACONs labels placement improvements',
                'Brand new Patreon page with benefits, goals, and highlighted supporters',
                'Support for RMP controllers and Australia extending sectors',
                'Many bug fixes for TRACONs',
                'Many other changes, fixes and improvements',
            ],
        },
    ],
};

const shownFeatureIndex = ref(0);
const shownFeature = computed(() => update.features[shownFeatureIndex.value]);

const show = ref(store.user?.settings.seenVersion !== update.name && localStorage.getItem('seen-version') !== update.name);

const close = () => {
    localStorage.setItem('seen-version', update.name);
    if (store.user) {
        $fetch('/api/user/settings', {
            method: 'POST',
            body: {
                ...store.user.settings,
                seenVersion: update.name,
            },
        });
    }
    show.value = false;
};
</script>

<style scoped lang="scss">
.update {
    &_title {
        position: relative;

        display: flex;
        gap: 0.3em;
        align-items: center;

        font-family: $openSansFont;
        font-size: 17px;
        line-height: 100%;
        color: $lightgray150;

        span {
            font-weight: 700;
            color: $primary500;
        }
    }

    &_feature {
        display: flex;
        flex-direction: column;
        gap: 8px;

        width: 100vw;
        max-width: 650px;
        height: var(--height);

        &_title {
            font-family: $openSansFont;
            font-size: 14px;
            font-weight: 700;
            color: $lightgray150;
        }

        &_image {
            height: 200px;
            background: no-repeat center / cover;
            border: 2px solid $darkgray800;
            border-radius: 8px;
        }

        &_text {
            display: flex;
            flex-direction: column;
            gap: 4px;

            font-size: 13px;
            color: $lightgray150;
        }

        &_navigation {
            align-items: flex-end;

            &, &_dots {
                display: flex;
                gap: 16px;
                justify-content: center;
            }

            &_dots {
                &_dot {
                    cursor: pointer;

                    width: 8px;
                    height: 8px;

                    background: $darkgray800;
                    border-radius: 100%;

                    transition: 0.3s;

                    &--active {
                        cursor: default;
                        background: $primary500;
                    }
                }
            }

            &_arrow {
                cursor: pointer;

                transform:rotate(90deg);

                width: 12px;

                color: $primary400;

                transition: 0.3s;

                @include hover {
                    &:hover {
                        color: $primary600;
                    }
                }

                &--left {
                    transform: rotate(-90deg);
                }

                &--disabled {
                    pointer-events: none;
                    cursor: default;
                    color: $darkgray800;
                }
            }
        }
    }
}
</style>
