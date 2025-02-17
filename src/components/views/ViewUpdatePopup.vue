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
    name: '1.0.2',
    height: 'auto',
    features: [
        {
            title: 'Quality of Life',
            description: 'Welcome to newest VATSIM Radar update! This is a small one, but we wanted to highlight some things.<br><br>Also, make sure to visit our Discord for full changelog: <a href="https://vatsim-radar.com/discord" target="_blank" class="__link">https://vatsim-radar.com/discord</a>',
            image: images['../../assets/update/quality.png'],
            list: [
                'New map layer instead of CartoDB, available in Light and Detailed variants. This layer renders <strong>on your device</strong>, so if you experience performance issues after this update - switch to Basic layer instead',
                'Satellite layer is back - but has quality data for USA only. Better Satellite is available for Patreon subscribers since we have to pay money for it. If you know a better free unlimited satellite layer - let us know',
                'Updated VA CS parsing logic - VA will now require to be present in GNG fictional airlines list (or in VATSIM Radar Data repository)',
                'METARs will now be fetched from VATSIM API',
                'Small bug fixes',
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
