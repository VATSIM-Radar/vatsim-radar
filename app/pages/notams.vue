<template>
    <ui-page-container class="notams">
        <template #title>
            Internal NOTAMs management. Please leave
        </template>
        <!-- @vue-ignore -->
        <ui-button @click="[activeNotam = { active: true, dismissable: false }, editActive = true]">
            Create
        </ui-button>
        <div
            v-for="notam in notams"
            :key="notam.id"
            class="notams_notam"
        >
            <div class="notams_notam_title">
                {{notam.text}}
            </div>
            <div class="notams_notam_actions">
                <ui-toggle
                    v-model="notam.active"
                    @update:modelValue="saveActiveNotam(notam)"
                >
                    Active
                </ui-toggle>
                <ui-button
                    size="S"
                    @click="[activeNotam=notam, editActive = true]"
                >
                    <template #icon>
                        <edit-icon/>
                    </template>
                </ui-button>
                <ui-button
                    primary-color="error500"
                    size="S"
                    @click="[activeNotam=notam, deleteActive = true]"
                >
                    <template #icon>
                        <close-icon/>
                    </template>
                </ui-button>
            </div>
        </div>
        <popup-fullscreen
            v-if="activeNotam"
            v-model="editActive"
            width="600px"
        >
            <template #title>
                Edit
            </template>
            <div class="__info-sections">
                <ui-input-text v-model="activeNotam.text">
                    Text
                </ui-input-text>
                <ui-select
                    v-model="activeNotam.type"
                    :items="[{ value: NotamType.ERROR }, { value: NotamType.WARNING }, { value: NotamType.ANNOUNCEMENT }]"
                >
                    <template #label>
                        Type
                    </template>
                </ui-select>
                <ui-toggle v-model="activeNotam.active">
                    Active
                </ui-toggle>
                <ui-toggle v-model="activeNotam.dismissable">
                    Dismissable
                </ui-toggle>
                <ui-input-text
                    input-type="datetime-local"
                    :model-value="activeNotam.activeFrom?.slice(0, 16)"
                    @update:modelValue="activeNotam.activeFrom = $event ? new Date($event!).toISOString() : null"
                >
                    activeFrom
                </ui-input-text>
                <ui-input-text
                    input-type="datetime-local"
                    :model-value="activeNotam.activeTo?.slice(0, 16)"
                    @update:modelValue="activeNotam.activeTo = $event ? new Date($event!).toISOString() : null"
                >
                    activeTo
                </ui-input-text>
            </div>
            <template #actions>
                <ui-button @click="() => saveActiveNotam()">
                    Save
                </ui-button>
            </template>
        </popup-fullscreen>
        <popup-fullscreen
            v-if="activeNotam"
            v-model="deleteActive"
        >
            <template #title>
                Delete
            </template>
            <template #actions>
                <ui-button @click="deleteActiveNotam">
                    Delete
                </ui-button>
                <ui-button @click="deleteActive = false">
                    Cancel
                </ui-button>
            </template>
        </popup-fullscreen>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import EditIcon from 'assets/icons/kit/edit.svg?component';
import CloseIcon from '@/assets/icons/basic/close.svg?component';
import { NotamType } from '~/utils/shared/vatsim';
import type { RadarNotam } from '~/utils/shared/vatsim';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';

const { data: notams, refresh } = await useAsyncData('internal-notams', () => $fetch<RadarNotam[]>('/api/data/notams/0'), {
    server: false,
});

const activeNotam = ref<null | RadarNotam>(null);
const editActive = ref(false);
const deleteActive = ref(false);

const saveActiveNotam = async (notam: RadarNotam = activeNotam.value!) => {
    await $fetch<any>(`/api/data/notams/${ notam.id }`, {
        method: notam?.id ? 'PUT' : 'POST',
        body: {
            ...notam,
            id: undefined,
        },
    });
    activeNotam.value = null;
    editActive.value = false;
    refresh();
};

const deleteActiveNotam = async () => {
    await $fetch<any>(`/api/data/notams/${ activeNotam.value!.id }`, { method: 'DELETE' });
    activeNotam.value = null;
    deleteActive.value = false;
    refresh();
};
</script>

<style scoped lang="scss">
.notams {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &_notam {
        cursor: pointer;

        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;

        padding: 8px;
        border-radius: 8px;

        background: $darkgray900;

        &_actions {
            display: flex;
            gap: 8px;
        }
    }
}
</style>
