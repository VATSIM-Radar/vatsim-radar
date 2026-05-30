<template>
    <popup-fullscreen
        v-model="model"
        width="600px"
    >
        <template #title>
            {{ isEdit ? 'Edit Dashboard' : 'Create Dashboard' }}
        </template>

        <div class="dashboard-edit">
            <ui-input-text
                v-model="name"
                placeholder="Dashboard name"
            />
            <div
                v-if="prefillAirport"
                class="dashboard-edit_hint"
            >
                Starting airport: <strong>{{ prefillAirport }}</strong>
            </div>
        </div>

        <template #actions>
            <ui-button
                type="secondary"
                @click="model = false"
            >
                Cancel
            </ui-button>
            <ui-button :disabled="!canSave">
                {{ isEdit ? 'Save' : 'Create' }}
            </ui-button>
        </template>
    </popup-fullscreen>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import type { UserDashboard } from '~/utils/server/handlers/dashboards';

const props = defineProps({
    editDashboard: {
        type: Object as PropType<UserDashboard | null>,
        default: null,
    },
    prefillAirport: {
        type: String as PropType<string | null>,
        default: null,
    },
});

const model = defineModel({ type: Boolean, default: false });

const isEdit = computed(() => !!props.editDashboard);

const name = ref('');

// The full configuration form (airports, map, enroute, columns) and the
// save/validation logic are built in Phase 5. Until those fields exist the
// primary action stays disabled so an incomplete dashboard cannot be created.
const canSave = computed(() => false);

// Reset the form whenever the window is (re)opened so create and edit modes
// always start from a clean, correct state.
watch(model, open => {
    if (!open) return;
    name.value = props.editDashboard?.name ?? '';
});
</script>

<style scoped lang="scss">
.dashboard-edit {
    display: flex;
    flex-direction: column;
    gap: 12px;

    &_hint {
        font-size: 13px;
        color: $lightGray500;

        strong {
            font-weight: 600;
            color: $blue500;
        }
    }
}
</style>
