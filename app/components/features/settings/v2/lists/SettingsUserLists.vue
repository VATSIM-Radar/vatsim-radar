<template>
    <div class="lists">
        <div class="lists_title">
            <ui-text type="h4">
                User Lists
            </ui-text>
            <ui-button
                :disabled="store.lists.length >= MAX_USER_LISTS"
                size="S"
                @click="newList = true"
            >
                Add New
            </ui-button>
        </div>

        <template v-if="store.user">
            <div class="lists_items">
                <div
                    v-for="list in store.lists"
                    :key="list.id"
                    class="lists__list"
                    :style="{ '--color': list.color in radarColors ? radarColors[list.color as ColorsList] : list.color }"
                >
                    <ui-text
                        class="lists__list_title"
                        type="h5-upper"
                    >
                        {{list.name}}
                    </ui-text>
                    <ui-separator
                        dashed
                        distance="0"
                        full
                    />
                    <ui-text
                        class="lists__list_counter"
                        type="2b-medium"
                    >
                        {{list.users.length}}
                    </ui-text>
                </div>
            </div>
        </template>
        <template v-else>
            <ui-text type="h5">
                Only logged in users can save user lists and add friends.
            </ui-text>
            <ui-button href="/api/auth/vatsim/redirect">
                Login
            </ui-button>
        </template>
    </div>
</template>

<script setup lang="ts">
import UiText from '~/components/ui/text/UiText.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import type { UserList } from '~/utils/server/handlers/lists';
import { MAX_USER_LISTS } from '~/utils/shared';
import UiSeparator from '~/components/ui/data/UiSeparator.vue';

const store = useStore();

const newList = ref(false);
const activeList = ref<UserList | null>(null);

const lists = computed(() => {

});
</script>

<style scoped lang="scss">
.lists {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;

    &_title {
        display: flex;
        gap: 16px;
        align-items: center;
    }

    &_items {
        display: grid;
        grid-template-columns: repeat(2, calc(50% - 8px));
        align-self: stretch;
        justify-content: space-between;
    }

    &__list {
        cursor: pointer;

        position: relative;

        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: space-between;

        min-height: 120px;
        padding: 16px 16px 16px 32px;
        border: 1px solid $strokeDefault;
        border-radius: 4px;

        background: $whiteAlpha2;

        &::before {
            content: '';

            position: absolute;
            top: 10%;
            left: 0;

            width: 8px;
            height: 80%;
            border-top-right-radius: 8px;
            border-bottom-right-radius: 8px;

            background: var(--color);
        }

        @include hover {
            transition: 0.3s;

            &:hover {
                border-color: $strokeSecondary
            }
        }

        &_title {
            flex-grow: 1;
        }

        &_counter {
            display: flex;
            align-items: center;
            justify-content: center;

            width: 32px;
            height: 32px;
            border-radius: 9999px;

            color: $brandPrimary;

            background: $blue500Alpha12;
        }
    }
}
</style>
