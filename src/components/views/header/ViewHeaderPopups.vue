<template>
    <common-popup v-model="store.loginPopup">
        <template #title>
            Authorize via VATSIM
        </template>
        In order to edit and save your settings, you must authorize first.
        <template #actions>
            <common-button
                type="secondary"
                @click="store.loginPopup = false"
            >
                Stand by
            </common-button>
            <common-button href="/api/auth/vatsim/redirect">
                Wilco
            </common-button>
        </template>
    </common-popup>
    <common-popup v-model="store.deleteAccountPopup">
        <template #title>
            Account Deletion
        </template>
        Are you completely sure you want to delete your account?<br><br>
        <strong>You will not be able to cancel this action</strong>. All your VATSIM Radar information and
        preferences will be permanently lost.
        <template #actions>
            <common-button
                type="secondary"
                @click="deleteAccount"
            >
                Permanently delete account
            </common-button>
            <common-button @click="store.deleteAccountPopup = false">
                Cancel that please
            </common-button>
        </template>
    </common-popup>
    <common-popup v-model="store.deleteNavigraphPopup">
        <template #title>
            Navigraph Account Unlink
        </template>
        Are you sure you want to unlink your Navigraph account?<br><br>
        Well, you can always link that again later anyway.
        <template #actions>
            <common-button
                type="secondary"
                @click="deleteNavigraphAccount"
            >
                Unlink Navigraph account
            </common-button>
            <common-button @click="store.deleteNavigraphPopup = false">
                Nah, I'm good
            </common-button>
        </template>
    </common-popup>
</template>

<script setup lang="ts">
import CommonPopup from '~/components/common/popup/CommonPopup.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
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
