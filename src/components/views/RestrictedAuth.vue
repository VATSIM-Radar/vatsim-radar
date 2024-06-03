<template>
    <common-page-block>
        <template #title>
            <template v-if="!store.user">
                Auth is required
            </template>
            <template v-else>
                Not enough permissions
            </template>
        </template>
        <template v-if="!store.user">
            You have to authorize and be allowed to use this version of VATSIM Radar. Please <code>/verify</code> yourself in Discord and authorize:<br><br>
            <common-button
                href="/api/auth/vatsim/redirect"
                width="200px"
            >
                Login
            </common-button>
        </template>
        <template v-else>
            <div class="__info-sections">
                Oops! You don't have Discord role to access this version of VATSIM Radar.<br><br>

                <common-button
                    href="/api/user/logout"
                    width="300px"
                >
                    Wrong account! Let me relogin...
                </common-button>
            </div>
        </template>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import { useStore } from '~/store';
import CommonButton from '~/components/common/basic/CommonButton.vue';

const store = useStore();
</script>
