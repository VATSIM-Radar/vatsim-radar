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
    name: '1.0.0',
    height: '430px',
    features: [
        {
            title: 'Welcome to newest VATSIM Radar update!',
            image: images['../../assets/update/presentation.png'],
            imageRatio: '1920 / 1080',
            description: `This update marks an important milestone for VATSIM Radar. Of course, no one considered it a beta anymore, but we still didn't have features people could get used to in other map services. Well, we do now.`,
            list: [
                'Airports Layouts: taximap for Navigraph Ultimate members',
                'Filters: VATSpy and FR24-inspired filters with an ability to share them with anyone',
                'Bookmarks: Bookmark any location or airport - and assign a key to quickly open it',
                'Friends: track users and view what are they doing, from flying to SUPing',
                'VATGlasses: a long-awaited integration developed by community member Felix',
            ],
        },
        {
            title: 'Airports Layouts',
            image: images['../../assets/update/layouts.png'],
            description: 'VATSIM Radar expands it’s partnership with Navigraph, and now all Navigraph Unlimited subscribers can view Airports Layouts!',
            list: [
                'View airport map in many large airports with holding points, intersections, taxiways, and more',
                'Enjoy updated gates data for those airports - a great improvement especially for USA airports!',
                'Fallback to old system and disabled layers if needed in Map Settings',
            ],
        },
        {
            title: 'Filters',
            description: 'VATSpy and FlightRadar24-inspired filters with all the settings you may need. At least, we hope so...',
            image: images['../../assets/update/filters.png'],
            list: [
                'Filters pilots and ATC by callsigns, rating, and a friend list',
                'Filter departure/arrival airports for flights - or import them directly from ongoing events!',
                'Save your filters if you are logged in',
                'Share you filters with friends - even if they are not authorized!',
            ],
        },
        {
            title: 'VATGlasses',
            image: images['../../assets/update/vatglasses.png'],
            list: [
                'Detailed sectors with vertical splits - very useful for Europe flights',
                'Developed by Felix',
                'Auto-enabled if you are logged in and in active flight',
                'Level is controllable in a footer',
            ],
        },
        {
            title: 'Friends',
            image: images['../../assets/update/friends.png'],
            list: [
                'Track your friends and view what are they doing',
                'Make friends lists with different names and colors',
                'Focus on your friend in one click',
            ],
        },
        {
            title: 'Bookmarks',
            image: images['../../assets/update/bookmarks.png'],
            list: [
                'Bookmark airport or your current location',
                'Quickly access bookmarks via footer/header shortcut or keyboard binding',
                'Share any bookmark with anyone',
            ],
        },
        {
            title: 'Quality of Life',
            description: 'Come visit our Discord for full changelog: https://vatsim-radar.com/discord',
            image: images['../../assets/update/quality.png'],
            list: [
                'New aircraft icons from DotWallop: will add later',
                'New VATSpy-like layer',
                'Search can now be opened using CTRL+F',
                'Airline display into pilot popup',
                'Many other changes, fixes and improvements',
            ],
        },
    ],
    active: false,
};

if (!store.user?.hasCharts) {
    update.features[1].list!.push('<a class="navigraph" href="https://navigraph.com/pricing?utm_source=vatsimradar&utm_medium=referral&utm_campaign=subscribe" target="_blank">Subscription Options</a>');
}

if (!store.user?.hasFms && store.user) {
    update.features[1].list!.push('<a class="navigraph" href="/api/auth/navigraph/redirect" target="_blank"> Connect Navigraph</a>');
}

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
