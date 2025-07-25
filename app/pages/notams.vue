<template>
    <common-page-block class="notams">
        <template #title>
            Internal NOTAMs management. Please leave
        </template>
        <!-- @vue-ignore -->
        <common-button @click="[activeNotam = { active: true, dismissable: false }, editActive = true]">
            Create
        </common-button>
        <div
            v-for="notam in notams"
            :key="notam.id"
            class="notams_notam"
        >
            <div class="notams_notam_title">
                {{notam.text}}
            </div>
            <div class="notams_notam_actions">
                <common-toggle
                    v-model="notam.active"
                    @update:modelValue="saveActiveNotam(notam)"
                >
                    Active
                </common-toggle>
                <common-button
                    size="S"
                    @click="[activeNotam=notam, editActive = true]"
                >
                    <template #icon>
                        <edit-icon/>
                    </template>
                </common-button>
                <common-button
                    primary-color="error500"
                    size="S"
                    @click="[activeNotam=notam, deleteActive = true]"
                >
                    <template #icon>
                        <close-icon/>
                    </template>
                </common-button>
            </div>
        </div>
        <common-popup
            v-if="activeNotam"
            v-model="editActive"
            width="600px"
        >
            <template #title>
                Edit
            </template>
            <div class="__info-sections">
                <common-input-text v-model="activeNotam.text">
                    Text
                </common-input-text>
                <common-select
                    v-model="activeNotam.type"
                    :items="[{ value: NotamType.ERROR }, { value: NotamType.WARNING }, { value: NotamType.ANNOUNCEMENT }]"
                >
                    <template #label>
                        Type
                    </template>
                </common-select>
                <common-toggle v-model="activeNotam.active">
                    Active
                </common-toggle>
                <common-toggle v-model="activeNotam.dismissable">
                    Dismissable
                </common-toggle>
                <common-input-text
                    input-type="datetime-local"
                    :model-value="activeNotam.activeFrom?.slice(0, 16)"
                    @update:modelValue="activeNotam.activeFrom = $event ? new Date($event!).toISOString() : null"
                >
                    activeFrom
                </common-input-text>
                <common-input-text
                    input-type="datetime-local"
                    :model-value="activeNotam.activeTo?.slice(0, 16)"
                    @update:modelValue="activeNotam.activeTo = $event ? new Date($event!).toISOString() : null"
                >
                    activeTo
                </common-input-text>
            </div>
            <template #actions>
                <common-button @click="() => saveActiveNotam()">
                    Save
                </common-button>
            </template>
        </common-popup>
        <common-popup
            v-if="activeNotam"
            v-model="deleteActive"
        >
            <template #title>
                Delete
            </template>
            <template #actions>
                <common-button @click="deleteActiveNotam">
                    Delete
                </common-button>
                <common-button @click="deleteActive = false">
                    Cancel
                </common-button>
            </template>
        </common-popup>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import EditIcon from 'assets/icons/kit/edit.svg?component';
import CloseIcon from '@/assets/icons/basic/close.svg?component';
import { NotamType } from '~/utils/shared/vatsim';
import type { RadarNotam } from '~/utils/shared/vatsim';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';

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
