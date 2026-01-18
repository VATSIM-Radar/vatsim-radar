<template>
    <popup-fullscreen v-model="store.loginPopup">
        <template #title>
            Authorize via VATSIM
        </template>
        In order to edit and save your settings, you must authorize first.
        <template #actions>
            <ui-button
                type="secondary"
                @click="store.loginPopup = false"
            >
                Stand by
            </ui-button>
            <ui-button href="/api/auth/vatsim/redirect">
                Wilco
            </ui-button>
        </template>
    </popup-fullscreen>
    <popup-fullscreen v-model="store.deleteAccountPopup">
        <template #title>
            Account Deletion
        </template>
        Are you completely sure you want to delete your account?<br><br>
        <strong>You will not be able to cancel this action</strong>. All your VATSIM Radar information and
        preferences will be permanently lost.
        <template #actions>
            <ui-button
                type="secondary"
                @click="deleteAccount"
            >
                Permanently delete account
            </ui-button>
            <ui-button @click="store.deleteAccountPopup = false">
                Cancel that please
            </ui-button>
        </template>
    </popup-fullscreen>
    <popup-fullscreen v-model="store.deleteNavigraphPopup">
        <template #title>
            Navigraph Account Unlink
        </template>
        Are you sure you want to unlink your Navigraph account?<br><br>
        Well, you can always link that again later anyway.
        <template #actions>
            <ui-button
                type="secondary"
                @click="deleteNavigraphAccount"
            >
                Unlink Navigraph account
            </ui-button>
            <ui-button @click="store.deleteNavigraphPopup = false">
                Nah, I'm good
            </ui-button>
        </template>
    </popup-fullscreen>
</template>

<script setup lang="ts">
import PopupFullscreen from '~/components/popups/PopupFullscreen.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import { useStore } from '~/store';

const store = useStore();

const deleteAccount = async () => {
    await $fetch('/api/user/delete', {
        method: 'POST',
    });
    location.reload();
};

const deleteNavigraphAccount = async () => {
    await $fetch('/api/user/unlink-navigraph', {
        method: 'POST',
    });
    store.user!.hasFms = null;
    store.deleteNavigraphPopup = false;
};
</script>
