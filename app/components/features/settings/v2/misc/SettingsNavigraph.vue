<template>
    <div class="navigraph __horizontal-group-16">
        <ui-chip :color="store.user?.hasCharts ? 'green500' : store.user?.hasFms ? 'teal500' : undefined" text-type="caption-medium">
            <template v-if="store.user?.hasCharts">
                Unlimited
            </template>
            <template v-else-if="store.user?.hasFms">
                Data
            </template>
            <template v-else-if="!store.user || store.user?.hasFms === null">
                Not linked
            </template>
            <template v-else>
                Standard
            </template>
        </ui-chip>
        <ui-button
            v-if="store.user?.hasFms === null"
            type="link"
            @click="navigraphAuth"
        >
            Connect Navigraph
        </ui-button>
        <ui-button
            v-else-if="store.user?.hasCharts === false"
            href="https://navigraph.com/pricing?utm_source=vatsimradar&utm_medium=referral&utm_campaign=subscribe"
            icon-width="25px"
            target="_blank"
            type="link"
        >
            <template #icon>
                <img
                    alt="Navigraph"
                    src="~/assets/icons/header/navigraph.svg"
                >
            </template>
            Subscription Options
        </ui-button>
        <ui-button
            v-else-if="!store.user"
            type="link"
            @click="vatsimAuth"
        >
            Login
        </ui-button>
        <ui-button
            v-if="store.user?.hasFms !== null"
            hover-color="red600"
            link-color="red500"
            type="link"
            @click="store.deleteNavigraphPopup = true"
        >
            Unlink
        </ui-button>
    </div>
</template>

<script setup lang="ts">
import UiChip from '~/components/ui/text/UiChip.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import { navigraphAuth, vatsimAuth } from '../../../../../composables/vatsim/auth';

const store = useStore();
</script>
