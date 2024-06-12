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
    type: 'major',
    name: '0.4.0',
    height: '470px',
    features: [
        {
            title: 'Airport Dashboard',
            image: images['../../assets/update/dashboard.png'],
            description: `Brand-new Airport Dashboard is now available via permanent link on /airport/icao (can also be opened from airport popup).<br><br>

Dashboard is equipped for both pilots and controllers, with features that all of you could enjoy.`,
            list: [
                'View all airport info on the same screen',
                'View airport traffic - and filter it by type if you want',
                'Enjoy Controller Mode, which will only leave aircraft on your screen, categorized by their type',
                'Toggle "show pilot stats" to quickly identify newbies from experienced folks',
                'Hide or expand map or columns - flexibility is everything!',
            ],
        },
        {
            title: 'Aircraft History Turns',
            image: images['../../assets/update/turns.png'],
            description: 'You can now see history of turns for any aircraft on map!',
            list: [
                'Lines are colored - identify descend or approx current aircraft altitude just by looking at line',
                'Available when you open overlay or hover on aircraft',
                '(!) Also available if you toggle airport arriving tracks - but that\'s experimental, and we might disable this in future for performance reasons (or make this Patreon feature!)',
            ],
        },
        {
            title: 'Map Layers & Weather',
            image: images['../../assets/update/layers.png'],
            list: [
                'Jawg, Satellite and OSM layers',
                'Wind speed, clouds',
                'Precipitation - from two different sources!',
            ],
        },
        {
            title: 'What else?',
            description: 'Full changelog is available in our <a class="__link" href="/discord" target="_blank">Discord</a>',
            list: [
                'New aircraft icons',
                'Airport share button',
                'UI/UX improvements, sector colors redesign',
                'Performance improvements',
                'Bug fixes',
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
