<template>
    <common-popup
        v-if="!store.config.hideHeader && update.active !== false"
        :model-value="show"
        @update:modelValue="close"
    >
        <template #title>
            <div
                ref="title"
                class="update_title"
            >
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
                :class="{ 'update_feature_image--has-ratio': shownFeature.imageRatio }"
                :style="{ backgroundImage: `url(${ shownFeature.image })`, aspectRatio: shownFeature.imageRatio }"
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

    imageRatio?: string;
}

interface Update {
    type: 'minor' | 'major';
    name: string;
    height?: string;
    features: UpdateFeature[];
    active?: boolean;
}

const store = useStore();
const images = import.meta.glob('../../assets/update/*', { import: 'default', eager: true });
const title = useTemplateRef('title');

const update: Update = {
    type: 'major',
    name: '1.1.0',
    height: '580px',
    features: [
        {
            title: 'Welcome to newest VATSIM Radar update!',
            image: images['../../assets/update/presentation.png'],
            imageRatio: '1920 / 1080',
            description: `This update is packed with a bunch of new features that were requested from our fellow community.`,
            list: [
                'SIGMETs: view them directly on map or on separate page. AIRMETs are also available for US!',
                'Bookings: view Bookings on map and timeline on separate page - made by Noah Elijah Till',
                'Stats: view live VATSIM data',
                'Many other features, UI/UX improvements and bug fixes',
            ],
        },
        {
            title: 'SIGMETs',
            image: images['../../assets/update/sigmets.png'],
            description: `Provided by Aviation Weather Center, SIGMETs are now available in VATSIM Radar!`,
            list: [
                'Enable SIGMETs for main map - or view them on separate page',
                'Hide different SIGMETs types',
                'View US AIRWAYs - not available for other continents, at least for now',
                'Click on SIGMET to view additional details',
                'Enable them now in Map Layers',
            ],
        },
        {
            title: 'Bookings (BETA)',
            image: images['../../assets/update/bookings.png'],
            description: `Developed by Noah Elijah Till, Bookings are finally available in VATSIM Radar!`,
            list: [
                'View timeline on separate page',
                'Click on airport group to view bookings by position',
                'View all coming bookings on map by setting their date',
                'Bookings are also displayed on map (TWR and below for now)',
                'This feature should now be considered BETA - more improvements are coming later',
            ],
        },
        {
            title: 'Live Stats',
            description: `Long-time requested SimAware feature is making it's way to VR!`,
            image: images['../../assets/update/stats.png'],
            list: [
                'View top Airports, Airlines, Aircraft, Routes',
                'View ATC and Pilots online',
                'Sort columns if needed',
                'Open a specific route on map or filter it by airline - using only one click',
            ],
        },
        {
            title: 'Quality of Life',
            description: 'Visit our <a href="/discord" target="_blank">Discord</a> for a full changelog',
            image: images['../../assets/update/quality.png'],
            list: [
                'You can now sort presets (map settings, filters, bookmarks)',
                'You can now import favorite lists - even from VATSpy config!',
                'Added relative scale indicator',
                'Updated default Map Layer data',
                'Small performance and data consumption improvements',
                'Diverting flight state by Noah Elijah Till',
                'New aircraft icons from DotWallop',
                'Many other improvements and bug fixes',
            ],
        },
    ],
    active: true,
};

const shownFeatureIndex = ref(0);
const shownFeature = computed(() => update.features[shownFeatureIndex.value]);

const show = ref(store.user?.settings.seenVersion !== update.name && localStorage.getItem('seen-version') !== update.name);

watch(shownFeatureIndex, () => {
    if (title.value) {
        const popup = title.value.closest('.popup_container');
        if (popup) popup.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

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

        @include mobileOnly {
            flex-wrap: wrap;
            max-width: 80%;
        }

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
        min-height: var(--height);

        :deep(.navigraph) {
            color: #d54a46;
        }

        @include mobileOnly {
            width: 80dvw;
            height: auto;
        }

        &_title {
            font-family: $openSansFont;
            font-size: 14px;
            font-weight: 700;
            color: $lightgray150;
        }

        &_image {
            height: 200px;
            border: 2px solid $darkgray800;
            border-radius: 8px;
            background: no-repeat top / cover;

            &--has-ratio {
                height: auto;
            }
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
                    border-radius: 100%;

                    background: $darkgray800;

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
