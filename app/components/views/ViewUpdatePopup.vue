<template>
    <common-popup
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
    </common-popup>
</template>

<script setup lang="ts">
import ArrowTopIcon from 'assets/icons/kit/arrow-top.svg?component';
import { useStore } from '~/store';
import { showUpdatePopup, updatePopupActive } from '~/composables';

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
    features: [
        {
            title: 'Welcome to quality of life VATSIM Radar update!',
            description: 'This update adds new features and fixes many issues. Visit our <a href="/discord" target="_blank">Discord</a> for a full changelog',
            image: images['../../assets/update/quality.png'],
            list: [
                'Auto-updates for weather and NOTAMs in Airport Dashboard',
                'Registration, alternates and voice rules in pilot overlay',
                'Various performance and memory usage improvements',
                'Significant improvement on Navigraph route memory usage in exchange of slow first load you have just experienced',
                'Weather information panel in Airport Dashboard',
                'Other bug fixes and improvements',
            ],
        },
        {
            title: `What's next?`,
            description: `VATSIM Radar is on short break for now. You can expect settings overhaul, VATSIM Radar partial redesign, and maybe more huge features somewhere around Q1 2026. View <a href="https://discord.com/channels/1223649894191992914/1228745758367285398/1409475830249427056" target="_blank">this post</a> in our Discord to learn more.<br><br>See you around, and thanks for your support.`,
            image: images['../../assets/update/changes.png'],
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
