<template>
    <div v-if="store.user?.privateMode" class="private-mode __vertical-group-16">
        <ui-notification type="info">
            Active until {{store.user!.privateUntil ? `${ formatterTime.format(new Date(store.user!.privateUntil)) }Z` : 'disabled'}}
        </ui-notification>
        <ui-toggle
            align-left
            model-value
            @update:modelValue="setPrivateMode(false)"
        >
            Deactivate
        </ui-toggle>
    </div>
</template>

<script setup lang="ts">
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';

const store = useStore();

const formatterTime = computed(() => new Intl.DateTimeFormat(['de-DE'], {
    hourCycle: store.user?.settings.timeFormat === '12h' ? 'h12' : 'h23',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
}));
</script>
