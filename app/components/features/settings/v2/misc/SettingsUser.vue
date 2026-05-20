<template>
    <div class="settings-user __vertical-group-16">
        <ui-text type="1b">VATSIM ID: <strong>{{store.user?.cid ?? 'Not logged in'}}</strong></ui-text>
        <ui-button-group v-if="store.user">
            <ui-button
                :href="`https://stats.vatsim.net/stats/${ store.user?.cid }`"
                target="_blank"
            >
                My stats
            </ui-button>
            <ui-button
                class="settings__logout"
                href="/api/user/logout"
                type="destructive"
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

const store = useStore();
</script>


