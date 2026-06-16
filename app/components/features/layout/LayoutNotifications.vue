<template>
    <div class="notifications">
        <transition-group name="notifications_notification--appear">
            <ui-snackbar
                v-for="notification in store.localNotifications.slice(0,3)"
                :key="notification.id!"
                class="notifications_notification"
                :model-value="notification.closable ? true : undefined"
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
    z-index: 1000;
    top: 64px;
    right: 16px;

    display: flex;
    flex-direction: column;
    gap: 12px;

    &_notification {
        position: relative;
        top: 0;
        overflow: hidden;
        background: $darkGray800;

        &--appear {
            &-enter-active,
            &-leave-active {
                max-height: 200px;
                transition: 0.3s ease-out;
            }

            &-enter-from,
            &-leave-to {
                overflow: hidden;

                max-height: 0;
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
