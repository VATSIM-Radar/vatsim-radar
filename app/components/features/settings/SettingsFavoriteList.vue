<template>
    <div
        v-if="cid.toString() !== store.user?.cid"
        class="list"
        :class="{ 'list--added': addedList }"
    >
        <ui-tooltip
            v-model="tooltipOpen"
            close-method="clickOutside"
            :location
            :open-method="addedList ? 'disabled' : 'click'"
            :width="isMobile ? '60vw' : '300px'"
        >
            <template #activator>
                <div
                    class="list_activator"
                    @click="addedList && removeFromList()"
                >
                    <component
                        :is="addedList ? StarFilledIcon : StarIcon"
                        width="16"
                    />
                </div>
            </template>

            <div class="__info-sections list__container">
                <div class="list__title">
                    Add to Favorites
                </div>

                <ui-input-text v-model="name"/>

                <ui-input-text
                    v-model="comment"
                    placeholder="Comment"
                />

                <ui-radio-group
                    :items="store.lists.filter(x => x.users.length < MAX_LISTS_USERS).map(x => ({ value: x.id, text: x.name, key: x.id.toString() }))"
                    :model-value="selectedList?.id ?? addedList?.id"
                    two-cols
                    @update:modelValue="selectedList = store.lists.find(x => x.id === $event) ?? null"
                />

                <ui-button
                    :disabled="!selectedList?.name"
                    @click="addToList"
                >
                    Add to {{ selectedList?.name ?? 'list' }}
                </ui-button>
            </div>
        </ui-tooltip>
    </div>
</template>

<script setup lang="ts">
import StarIcon from '~/assets/icons/kit/star.svg?component';
import StarFilledIcon from '~/assets/icons/kit/star-filled.svg?component';
import { useStore } from '~/store';
import UiTooltip from '~/components/ui/data/UiTooltip.vue';
import type { TooltipLocation } from '~/components/ui/data/UiTooltip.vue';
import type { PropType } from 'vue';
import UiRadioGroup from '~/components/ui/inputs/UiRadioGroup.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import type { UserListLive } from '~/utils/backend/handlers/lists';
import { MAX_LISTS_USERS } from '~/utils/shared';

const props = defineProps({
    cid: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    location: {
        type: String as PropType<TooltipLocation>,
        default: 'left',
    },
});

const store = useStore();
const isMobile = useIsMobile();
const tooltipOpen = defineModel({ type: Boolean, default: false });

const addedList = computed(() => store.user?.lists.find(x => x.users.some(x => x.cid === props.cid)));

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
const name = ref(props.name.split(' ').slice(0, 2).join(' '));

// eslint-disable-next-line vue/no-ref-object-reactivity-loss
if (!isNaN(parseInt(name.value))) name.value = parseInt(name.value, 10).toString();

const comment = ref('');
const selectedList = shallowRef<UserListLive | null>(null);

onMounted(() => {
    if (store.lists.length === 1) selectedList.value = store.lists[0];
});

const addToList = async () => {
    if (!selectedList.value) return;

    const users = selectedList.value.users.slice(0).filter(x => x.cid !== props.cid);
    users.unshift({
        cid: props.cid,
        name: name.value,
        comment: comment.value,
        type: 'offline',
    });

    if (selectedList.value.id === 0) {
        await addUserList({
            ...selectedList.value,
            users,
        });
    }
    else {
        await editUserList({
            id: selectedList.value.id,
            users,
        });
    }

    tooltipOpen.value = false;
};

const removeFromList = () => {
    if (!addedList.value) return;

    const users = addedList.value.users.slice(0).filter(x => x.cid !== props.cid);

    editUserList({
        id: addedList.value.id,
        users,
    });
};
</script>

<style scoped lang="scss">
.list {
    &__title {
        font-size: 16px;
        font-weight: 600;
    }

    &__container {
        gap: 8px;
    }

    &_activator {
        cursor: pointer;

        @include hover {
            transition: 0.3s;

            &:hover {
                color: $warning500;
            }
        }
    }
}
</style>
