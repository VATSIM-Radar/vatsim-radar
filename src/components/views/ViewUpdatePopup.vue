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
    active?: boolean;
}

const store = useStore();
const images = import.meta.glob('../../assets/update/*', { import: 'default', eager: true });
const title = useTemplateRef('title');

const update: Update = {
    type: 'major',
    name: '0.5.0',
    height: '500px',
    features: [
        {
            title: 'Welcome to newest VATSIM Radar update!',
            image: images['../../assets/update/aircraft.png'],
            description: `Introducing 0.5.0, our largest update ever.<br><br>
                It's packed with a bunch of features. To get a video version, please visit our <a href="https://www.youtube.com/live/FaYfNPyBjkI" target="_blank">Showcase stream</a>.`,
            list: [
                'Map Settings with never seen before customization',
                'Basic Events page',
                'Search',
                'Mobile version',
                'Desktop/Mobile PWA clients',
            ],
        },
        {
            title: 'Map Settings',
            image: images['../../assets/update/settings.png'],
            description: 'Enjoy Map Settings - customize a bunch of stuff:',
            list: [
                'Enable Traffic Heatmap, emergency aircraft highlight',
                'Modify airport counters',
                'Hide almost anything on map - including personal info, ground traffic and "random" airports',
                'Customize how tracks are shown - including their color',
                'Speaking of - customize color and transparency of almost anything on map',
                'Save all of this as presets - and share those presets with friends!',
            ],
        },
        {
            title: 'Search',
            image: images['../../assets/update/search.png'],
            list: [
                'Search for flights, atc, airports',
                'Search by CIDs, callsigns, and other things',
                'Customize how many search results are displayed',
                'Open overlays by clicking on anything you found',
            ],
        },
        {
            title: 'Clients + Mobile version',
            image: images['../../assets/update/client.jpg'],
            list: [
                'Added mobile/tablet optimization',
                'Added "Install App" into "about" dropdown menu',
                'Added official PWA support',
            ],
        },
        {
            title: 'Events page',
            image: images['../../assets/update/events.jpg'],
            list: [
                'Enjoy basic events page',
                'Prefile recommended routes on VATSIM/SimBrief',
                'View events airports on map',
                'More to come',
            ],
        },
        {
            title: 'Quality of Life',
            description: 'Come visit our Discord for full changelog: https://vatsim-radar.com/discord',
            image: images['../../assets/update/quality.png'],
            list: [
                'New aircraft icons from DotWallop: A20N, A338, A339, P28*, P51, PA24, U2, SR22, GLEX, BE60 (+ imporved model matching)',
                'Improved Approach TRACON label rendering (by Felix)',
                'Reduced data consumption',
                'Copy button for controllers frequencies',
                'Your current position on map/controller dashboard is now remembered in GET parameters for you to save last position/settings',
                'Added "Share" window into filters dropdown - usable for PWAs, and also you can copy link which includes overlay from here',
                'Many other changes, fixes and improvements',
            ],
        },
    ],
    active: false,
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
        height: var(--height);

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
            background: no-repeat top / cover;
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
