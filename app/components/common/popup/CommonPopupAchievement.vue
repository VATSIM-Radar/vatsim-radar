<template>
    <common-popup
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
            <div
                v-if="'image_url' in model || 'badge_image_url' in model"
                class="achievement_image"
                :style="{ backgroundImage: `url(${ 'image_url' in model ? model.image_url : model.badge_image_url })` }"
            />
            <div class="achievement_provider">
                Provided by <a
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
            <common-button
                v-if="route.path !== '/achievements'"
                size="S"
                target="_blank"
                to="/achievements"
                type="secondary"
                width="100%"
            >
                View all achievements
            </common-button>
        </div>
        <template #actions>
            <common-button-group>
                <common-button
                    :href="model?.course_url"
                    target="_blank"
                >
                    Open course
                </common-button>
                <common-button @click="model = null">
                    Close
                </common-button>
            </common-button-group>
        </template>
    </common-popup>
</template>

<script setup lang="ts">
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonPopup from '~/components/common/popup/CommonPopup.vue';
import type { VatsimAchievementList, VatsimAchievementUser } from '~/types/data/vatsim';
import CommonButtonGroup from '~/components/common/basic/CommonButtonGroup.vue';

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
        aspect-ratio: $achievementAspectRatio;
        width: 200px;
        border: 1px solid $darkgray800;
        border-radius: 8px;

        background-color: $darkgray1000;
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
    }

    &_provider + &_description {
        padding-top: 8px;
        border-top: 1px solid $darkgray800;
        text-align: justify;
    }
}
</style>


