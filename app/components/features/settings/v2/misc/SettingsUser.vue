<template>
    <div class="settings-user __vertical-group-16">
        <ui-text type="1b">VATSIM ID: <strong>{{store.user?.cid ?? 'Not logged in'}}</strong></ui-text>
        <ui-button
            v-if="store.user && !store.user.cid"
            size="S"
            @click="vatsimAuth"
        >
            Login with VATSIM
        </ui-button>
        <ui-button-group v-if="store.user">
            <ui-button
                :disabled="!store.user?.cid"
                :href="`https://stats.vatsim.net/stats/${ store.user?.cid }`"
                target="_blank"
            >
                My stats
            </ui-button>
            <ui-button
                class="settings__logout"
                type="destructive"
                @click="logout"
            >
                Logout
            </ui-button>
        </ui-button-group>
    </div>
</template>

<script setup lang="ts">
import UiButtonGroup from '~/components/ui/buttons/UiButtonGroup.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import UiText from '~/components/ui/text/UiText.vue';
import { logout, vatsimAuth } from '../../../../../composables/vatsim/auth';

const store = useStore();
</script>


