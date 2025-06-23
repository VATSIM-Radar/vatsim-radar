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
    name: '1.2',
    height: '580px',
    features: [
        {
            title: 'Welcome to newest VATSIM Radar update!',
            description: 'This update is packed with one of our the most longest requested features, and many more changes that will improve your usage of VATSIM Radar.',
            imageRatio: '1920 / 1080',
            image: images['../../assets/update/presentation.png'],
            list: [
                'Navigational data by Navigraph',
                'Predicted aircraft route',
                'Bookings improvements',
                'Distance measurement tool',
                'Shared cockpit support, weather request, and much more stuff',
            ],
        },
        {
            title: 'Navigational Data',
            description: 'Provided by Navigraph and Jeppesen, you can now view navdata on map!',
            image: images['../../assets/update/navdata.png'],
            list: [
                'Toggle Waypoints, Airways, NDB, VORDME, and Holdings',
                'View STARs, SIDs and Approaches for airports',
                'natTrak oceanic routes are now also available to toggle as part of this change',
                'Available for free with AIRAC 2404',
                'For newest AIRAC - see <a href="https://navigraph.com/pricing?utm_source=vatsimradar&utm_medium=referral&utm_campaign=subscribe" class="__link">Navigraph Subscription Options</a>',
            ],
        },
        {
            title: 'Predicted aircraft route',
            description: 'Meet one of most requested VATSIM Radar feature!',
            image: images['../../assets/update/route.png'],
            list: [
                'See actual predicted aircraft route instead of straight line',
                'SIDs and STARs are parsed automatically - with an ability to override them by ATC or you in pilot overlay',
                'ETA is now also calculated based on route to be flown',
                'Based on same AIRAC as NavData',
            ],
        },
        {
            title: 'Other highlights',
            description: 'Visit our <a href="/discord" target="_blank">Discord</a> for a full changelog',
            image: images['../../assets/update/changes.png'],
            list: [
                'Shared cockpit support has been added with an automatic detection - expect more updates on that in future',
                'Distance measurement tool has been added with NM/KM/Mi support',
                'Weather request popup straight for VATSpy enjoyers',
                'Bookings improvements by MindCollaps',
                'New weather layers - Radar and Ground elevation',
                'Observers page in Stats',
            ],
        },
        {
            title: 'Quality of Life',
            description: 'Visit our <a href="/discord" target="_blank">Discord</a> for a full changelog',
            image: images['../../assets/update/quality.png'],
            list: [
                'New customization settings and filters',
                'VATGlasses level can now be controlled by mouse wheel',
                'Mobile version tuning',
                'Performance and memory usage improvements',
                'Quiet airports algorithm changes to improve chances of pilots flying there',
                'Map initialization popup with retry functionality',
                'Other bug fixes and improvements',
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
