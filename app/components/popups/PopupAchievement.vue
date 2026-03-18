<template>
    <popup-fullscreen
        :model-value="!!model"
        width="600px"
        @update:modelValue="model = null"
    >
        <template #title>
            {{model?.name}}
        </template>
        <div
            v-if="model"
            class="achievement"
        >
            <div class="achievement_image">
                <div
                    v-if="'image_url' in model || 'badge_image_url' in model"
                    class="achievement_image_item"
                    :style="{ backgroundImage: `url(${ 'image_url' in model ? model.image_url : model.badge_image_url })` }"
                />
            </div>
            <div class="achievement_provider">
                Granted by <a
                    class="__link"
                    :href="model.provider_url"
                    target="_blank"
                >{{model.provider_name}}</a>
            </div>
            <div
                v-if="model.description"
                class="achievement_description"
            >
                {{model.description}}
            </div>
            <ui-button
                v-if="route.path !== '/achievements'"
                size="S"
                target="_blank"
                to="/achievements"
                type="secondary"
                width="100%"
            >
                View all achievements
            </ui-button>
        </div>
        <template #actions>
            <ui-button-group>
                <ui-button
                    :href="model?.course_url"
                    target="_blank"
                >
                    Open course
                </ui-button>
                <ui-button @click="model = null">
                    Close
                </ui-button>
            </ui-button-group>
        </template>
    </popup-fullscreen>
</template>

<script setup lang="ts">
import type { VatsimAchievementList, VatsimAchievementUser } from '~/types/data/vatsim';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiButtonGroup from '~/components/ui/buttons/UiButtonGroup.vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';

const model = defineModel({
    type: Object as PropType<VatsimAchievementList | VatsimAchievementUser | null>,
    default: null,
});

const route = useRoute();
</script>

<style lang="scss" scoped>
.achievement {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;

    text-align: center;

    &_image {
        width: 200px;
        padding: 8px;
        border: 1px solid $darkgray800;
        border-radius: 8px;

        background-color: $darkgray950;

        &_item {
            aspect-ratio: $achievementAspectRatio;
            width: 100%;

            background-repeat: no-repeat;
            background-position: center;
            background-size: contain;
        }
    }

    &_provider + &_description {
        padding-top: 8px;
        border-top: 1px solid $darkgray800;
        text-align: justify;
    }
}
</style>


