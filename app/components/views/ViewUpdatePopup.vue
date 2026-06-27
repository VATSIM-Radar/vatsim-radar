<template>
    <popup-fullscreen
        v-if="!store.config.hideHeader && update.active !== false"
        model-value
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
    </popup-fullscreen>
</template>

<script setup lang="ts">
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import { useStore } from '~/store';
import { showUpdatePopup, updatePopupActive } from '~/composables';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';

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
    name: String(updatePopupActive),
    type: 'minor',
    height: '650px',
    features: [
        {
            title: 'Welcome to VATSIM Radar v2.0 Public Preview!',
            description: 'This is a major VATSIM Radar update. Visit <a href="http://localhost:5173/blog/v2-closed-beta.html" class="__link" target="_blank">Preview FAQ</a> and read <a href="https://docs.vatsim-radar.com/changelog-v2.html" target="_blank" class="__link">Preliminary Changelog</a> for more details',
            image: images['../../assets/update/presentation.png'],
            imageRatio: '1920 / 1080',
            list: [
                'Settings v2.0',
                'Desktop App',
                'Infinite map',
                'Map Interaction Rework',
                'Controller Dashboard 2.0',
                'Performance Improvements',
                'Website Redesign',
                'New Features and Improvements',
            ],
        },
        {
            title: 'Settings 2.0',
            image: images['../../assets/update/settings.png'],
            imageRatio: '1920 / 1080',
            list: [
                'Settings page is now standalone',
                'You can search and preview settings on map',
                'All your settings have been migrated',
                'Settings are now auto saved',
                'Settings can be exported and imported',
            ],
        },
        {
            title: 'Desktop App',
            image: images['../../assets/update/app.png'],
            list: [
                'Standalone PC application',
                'Auto updates (Windows only)',
                'Discord Rich Presence support in Settings',
            ],
        },
        {
            title: 'Interaction Rework',
            image: images['../../assets/update/map.png'],
            imageRatio: '1920 / 1080',
            list: [
                'All hovers and clicks have priority now',
                'Mobile clicks have been reworked',
                'Context menu is now supported',
                'Map is now infinite',
                'Hovering should be much smoother in general',
            ],
        },
        {
            title: 'Controller Dashboard 2.0',
            description: 'Developed by psergienko',
            image: images['../../assets/update/dashboard.png'],
            imageRatio: '1920 / 1080',
            list: [
                'Multiple airports',
                'Separate page',
                'Public and private airports with saved settings',
                'Traffic prediction',
                'Enroute traffic',
            ],
        },
        {
            title: 'Other Features and Improvements',
            description: 'Visit <a href="https://docs.vatsim-radar.com/changelog-v2.html" target="_blank" class="__link">Preliminary Changelog</a> for more details',
            image: images['../../assets/update/changes.png'],
            list: [
                'Huge performance improvements',
                'Website redesign',
                'Overlays can now be minified',
                'Events are now displayed on map',
                'Departed and landed time are now saved',
                'You can now open aircraft photo if reg is correct',
                'Added vertical speed',
                'Navigraph AIRAC now updates in background',
                'Improved speed/altitude graph smoothness',
                'Filters UX improvements',
                'Added an ID for VATGlasses sectors',
                'Significantly improved bookings on map correct display, added Booked Until',
                'Fixed website reloading multiple times after update',
            ],
        },
    ],
    active: !!updatePopupActive,
};

const shownFeatureIndex = ref(0);
const shownFeature = computed(() => update.features[shownFeatureIndex.value]);

watch(shownFeatureIndex, () => {
    if (title.value) {
        const popup = title.value.closest('.popup_container');
        if (popup) popup.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

const close = async () => {
    localStorage.setItem('seen-version', update.name);
    await nextTick();
    triggerRef(showUpdatePopup);
    if (store.user) {
        store.user.settings.seenVersion = update.name;
        $fetch('/api/user/settings', {
            method: 'POST',
            body: {
                ...store.user.settings,
                seenVersion: update.name,
            },
        });
    }
};
</script>

<style scoped lang="scss">
.update {
    &_title {
        position: relative;

        display: flex;
        gap: 0.3em;
        align-items: center;


        font-size: 17px;
        line-height: 100%;
        color: $lightGray500;

        @include mobileOnly {
            flex-wrap: wrap;
            max-width: 80%;
        }

        span {
            font-weight: 700;
            color: $blue500;
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
            font-size: 14px;
            font-weight: 700;
            color: $lightGray500;
        }

        &_image {
            height: 200px;
            border: 2px solid $darkGray400;
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
            color: $lightGray500;
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

                    background: $darkGray400;

                    transition: 0.3s;

                    &--active {
                        cursor: default;
                        background: $blue500;
                    }
                }
            }

            &_arrow {
                cursor: pointer;

                transform:rotate(90deg);

                width: 12px;

                color: $blue400;

                transition: 0.3s;

                @include hover {
                    &:hover {
                        color: $blue600;
                    }
                }

                &--left {
                    transform: rotate(-90deg);
                }

                &--disabled {
                    pointer-events: none;
                    cursor: default;
                    color: $darkGray400;
                }
            }
        }
    }


}
</style>
