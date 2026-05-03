<template>
    <ui-page-container class="achievements">
        <template #title>Achievements</template>

        <ui-notification
            class="achievements_notification"
            remember-message="ACHIEVEMENTS_LINK"
            type="info"
        >
            <a
                class="__link"
                href="https://prams.vatsim.net/achievements"
                target="_blank"
            >
                Learn more about achievements
            </a>
        </ui-notification>

        <div class="achievements_list">
            <div
                v-for="(items, key) in groups"
                :key
                class="achievements_list_group"
            >
                <ui-block-title class="achievements_list_group_title">
                    {{key}}
                </ui-block-title>
                <div class="achievements_list_items">
                    <div
                        v-for="(achievement,index) in items"
                        :key="achievement.name+index"
                        class="achievements__achievement"
                        @click="selectedAchievement = achievement"
                    >
                        <div class="achievements__achievement_image">
                            <div
                                class="achievements__achievement_image_item"
                                :style="{ backgroundImage: `url(${ achievement.image_url })` }"
                            />
                        </div>
                        <div class="achievements__achievement_title">
                            {{achievement.name}}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <popup-achievement v-model="selectedAchievement"/>
    </ui-page-container>
</template>

<script setup lang="ts">
import type { VatsimAchievementList } from '~/types/data/vatsim';
import PopupAchievement from '~/components/popups/PopupAchievement.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import UiPageContainer from '~/components/ui/UiPageContainer.vue';

const selectedAchievement = shallowRef<VatsimAchievementList | null>(null);

const { data } = await useAsyncData('achievements', async () => {
    return $fetch<VatsimAchievementList[]>('/api/data/achievements');
});

useHead(() => ({
    title: 'Achievements',
}));

const groups = computed(() => {
    if (!data.value) return {};

    const groups: Record<string, VatsimAchievementList[]> = {};

    for (const item of data.value) {
        groups[item.provider_name] ??= [];
        groups[item.provider_name].push(item);
    }

    return groups;
});
</script>

<style lang="scss" scoped>
.achievements {
    & &_notification {
        display: inline-flex;
        margin-bottom: 16px;

        .__link {
            color: $lightgray200;
        }
    }

    &_list {
        --block-title-background: #{$darkgray950};
        display: flex;
        flex-direction: column;
        gap: 8px;

        &_items {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;

            @include mobileOnly {
                display: grid;
                grid-template-columns: repeat(2, calc(50% - 4px));
            }
        }
    }

    &__achievement {
        cursor: pointer;

        display: flex;flex-direction: column;
        gap: 16px;
        align-items: center;

        width: 200px;
        padding: 16px;
        border: 1px solid $darkgray800;
        border-radius: 8px;

        text-align: center;

        background: $darkgray1000;

        @include mobileOnly {
            width: auto;
        }

        &_image {
            width: 100%;
            padding: 8px;
            border-radius: 8px;
            background-color: $darkgray1000;

            &_item {
                aspect-ratio: $achievementAspectRatio;
                width: 100%;

                background-repeat: no-repeat;
                background-position: center;
                background-size: contain;
            }
        }

        &_title {
            font-weight: 600;

            @include mobileOnly {
                font-size: 14px;
            }
        }
    }
}
</style>
