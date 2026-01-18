<template>
    <div class="bookmark-data __info-sections">
        <ui-columns-display v-if="!id && (!airport || getAirport)">
            <template
                v-if="!airport"
                #col1
            >
                <div class="bookmark-data_airport __info-sections">
                    <ui-toggle v-model="airportMode">
                        Bookmark Airport {{ bookmark.icao }}
                    </ui-toggle>
                    <ui-input-text
                        v-if="airportMode"
                        height="36px"
                        :model-value="airportInput"
                        @change="dataStore.vatspy.value?.data.keyAirports.realIcao[($event.target as HTMLInputElement).value.toUpperCase()] ? airportInput = ($event.target as HTMLInputElement).value.toUpperCase() : airportInput = ''"
                    >
                        Airport ICAO
                    </ui-input-text>
                </div>
            </template>
            <template
                v-if="getAirport"
                #col2
            >
                <div class="__grid-info-sections __grid-info-sections--large-title">
                    <div class="__grid-info-sections_title">
                        Zoom Level
                    </div>
                    <ui-select
                        :items="zoomOptions"
                        max-dropdown-height="200px"
                        :model-value="bookmark.zoom ?? 14"
                        width="100%"
                        @update:modelValue="bookmark.zoom = $event as number"
                    />
                </div>
            </template>
        </ui-columns-display>
        <small v-else-if="id && getAirport">
            Airport: {{ getAirport }}
        </small>
        <div class="bookmark-data_keys __info-sections">
            <ui-block-title remove-margin>
                Key Binding (optional)
            </ui-block-title>
            <ui-notification
                cookie-name="bookmarks-keys"
                type="info"
            >
                Supported combinations: Shift/Alt/Ctrl/Win/CMD plus any <strong>keyboard</strong> button
            </ui-notification>

            <div
                v-if="bookmark.binding"
                class="bookmark-data_keys_data"
            >
                <span v-if="bookmark.binding?.keys?.ctrl">
                    CTRL
                </span>
                <span v-if="bookmark.binding?.keys?.alt">
                    ALT
                </span>
                <span v-if="bookmark.binding?.keys?.shift">
                    SHIFT
                </span>
                <span v-if="bookmark.binding?.keys?.meta">
                    WIN
                </span>
                <span>
                    {{ bookmark.binding?.code.replace('Key', '').replace('Digit', '') }}
                </span>
                <ui-button
                    link-color="error500"
                    type="link"
                    @click="delete bookmark.binding"
                >
                    Clear
                </ui-button>
            </div>

            <div class="bookmark-data_keys_data_input">
                <ui-input-text
                    ref="input"
                    :input-attrs="{ readonly: 'readonly' }"
                    model-value=""
                    placeholder="Press and type to bind..."
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { UserBookmark, UserBookmarkPreset } from '~/utils/server/handlers/bookmarks';
import UiToggle from '~/components/ui/inputs/UiToggle.vue';
import UiColumnsDisplay from '~/components/ui/data/UiColumnsDisplay.vue';
import UiInputText from '~/components/ui/inputs/UiInputText.vue';
import type { SelectItem } from '~/types/components/select';
import UiSelect from '~/components/ui/inputs/UiSelect.vue';
import UiNotification from '~/components/ui/data/UiNotification.vue';
import UiBlockTitle from '~/components/ui/text/UiBlockTitle.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import { useMapStore } from '~/store/map';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { useStore } from '~/store';

const props = defineProps({
    bookmark: {
        type: Object as PropType<UserBookmark>,
        required: true,
    },
    airport: {
        type: String,
    },
    id: {
        type: Number,
    },
});

const dataStore = useDataStore();
const mapStore = useMapStore();
const store = useStore();
const map = inject<ShallowRef<Map | null>>('map')!;
const airportMode = ref(false);
const airportInput = ref('');
const input = useTemplateRef('input');

const getAirport = computed(() => props.airport || airportInput.value || props.bookmark.icao);

// eslint-disable-next-line vue/no-setup-props-reactivity-loss
if (props.airport) props.bookmark.icao = props.airport;

const zoomOptions = (() => {
    const options: SelectItem[] = [];

    for (let i = 17; i >= 12; i -= 0.5) {
        options.unshift({
            value: i,
        });
    }

    return options;
})();

watch(airportInput, val => {
    if (!val) {
        delete props.bookmark.icao;
        return;
    }
    props.bookmark.icao = val;
});

watch(() => JSON.stringify(mapStore.extent), () => {
    const view = map.value?.getView();
    if (!view || props.id) return;

    if (!getAirport.value) {
        props.bookmark.coords = mapStore.center;
        props.bookmark.zoom = mapStore.zoom;
    }
    else if (!props.bookmark.zoom) props.bookmark.zoom = 14;
}, {
    immediate: true,
});

watch(() => JSON.stringify(props.bookmark), async () => {
    if (!props.id) return;

    airportInput.value = '';

    await $fetch<UserBookmarkPreset>(`/api/user/bookmarks/${ props.id }`, {
        method: 'PUT',
        body: {
            json: toRaw(props.bookmark),
        },
    });
    store.fetchBookmarks();
});

onMounted(() => {
    function handleKeys(event: KeyboardEvent) {
        if (!event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) return;
        if (event.key === 'Shift' || event.key === 'Alt' || event.key === 'Control' || event.key === 'Meta') return;

        event.preventDefault();
        props.bookmark.binding = {
            code: event.code.replace('Numpad', ''),
            keys: {
                meta: event.metaKey,
                alt: event.altKey,
                shift: event.shiftKey,
                ctrl: event.ctrlKey,
            },
        };
    }

    input.value!.$el.querySelector('input')!.addEventListener('keydown', handleKeys);
});
</script>

<style scoped lang="scss">
.bookmark-data {
    &_keys {
        &_data {
            display: flex;
            gap: 4px;
            align-items: center;

            span {
                padding: 4px;
                border-radius: 4px;

                font-family: $openSansFont;
                font-size: 12px;
                font-weight: 600;
                line-height: 100%;

                background: #26262C;
            }
        }
    }
}
</style>
