<template>
    <ui-page-container>
        <template #title>
            <template v-if="!store.user">
                Auth is required
            </template>
            <template v-else>
                Not enough permissions
            </template>
        </template>
        <template v-if="!store.user">
            You have to authorize and be allowed to use this version of VATSIM Radar. Please <code>/qa-verify</code> in Discord if you have access and authorize:<br><br>
            <ui-button
                href="/api/auth/vatsim/redirect"
                width="200px"
            >
                Login
            </ui-button>
        </template>
        <template v-else>
            <div class="__info-sections">
                Oops! You don't have Discord role to access this version of VATSIM Radar.<br><br>

                <ui-button
                    href="/api/user/logout"
                    width="300px"
                >
                    Wrong account! Let me relogin...
                </ui-button>
            </div>
        </template>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import { useStore } from '~/store';
import UiButton from '~/components/ui/buttons/UiButton.vue';

const store = useStore();
</script>
