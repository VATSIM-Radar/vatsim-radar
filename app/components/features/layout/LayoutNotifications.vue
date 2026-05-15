<template>
    <div class="notifications">
        <transition-group name="notifications_notification--appear">
            <ui-snackbar
                v-for="notification in store.localNotifications.slice(0,3)"
                :key="notification.id!"
                class="notifications_notification"
                :model-value="!!notification.closable"
                :type="notification.type"
                @update:modelValue="store.localNotifications = store.localNotifications.filter(x => x.id !== notification.id)"
            >
                {{notification.text}}
            </ui-snackbar>
        </transition-group>
    </div>
</template>

<script lang="ts" setup>
import UiSnackbar from '~/components/ui/data/UiSnackbar.vue';

const store = useStore();
</script>

<style lang="scss" scoped>
.notifications {
    position: fixed;
    top: 56px;
    right: 12px;

    display: flex;
    flex-direction: column;
    gap: 12px;

    &_notification {
        position: relative;
        top: 0;
        overflow: hidden;

        &--appear {
            &-enter-active,
            &-leave-active {
                transition: 0.3s ease-out;
            }

            &-enter-from,
            &-leave-to {
                margin-top: -12px;
                padding-top: 0;
                padding-bottom: 0;

                visibility: hidden;
                opacity: 0;
            }
        }
    }
}
</style>
