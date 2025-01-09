<template>
    <div class="bookmark-data __info-sections">
        <map-filter-columns v-if="!id && (!airport || getAirport)">
            <template
                v-if="!airport"
                #col1
            >
                <div class="bookmark-data_airport __info-sections">
                    <common-toggle v-model="airportMode">
                        Bookmark Airport {{ bookmark.icao }}
                    </common-toggle>
                    <common-input-text
                        v-if="airportMode"
                        height="36px"
                        :model-value="airportInput"
                        @change="dataStore.vatspy.value?.data.keyAirports.realIcao[($event.target as HTMLInputElement).value.toUpperCase()] ? airportInput = ($event.target as HTMLInputElement).value.toUpperCase() : airportInput = ''"
                    >
                        Airport ICAO
                    </common-input-text>
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
                    <common-select
                        :items="zoomOptions"
                        max-dropdown-height="200px"
                        :model-value="bookmark.zoom ?? 14"
                        width="100%"
                        @update:modelValue="bookmark.zoom = $event as number"
                    />
                </div>
            </template>
        </map-filter-columns>
        <small v-else-if="id && getAirport">
            Airport: {{ getAirport }}
        </small>
        <div class="bookmark-data_keys __info-sections">
            <common-block-title remove-margin>
                Key Binding (optional)
            </common-block-title>
            <common-notification
                cookie-name="bookmarks-keys"
                type="info"
            >
                Supported combinations: Shift/Alt/Ctrl/Win/CMD plus any <strong>keyboard</strong> button
            </common-notification>

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
                <common-button
                    link-color="error500"
                    type="link"
                    @click="delete bookmark.binding"
                >
                    Clear
                </common-button>
            </div>

            <div class="bookmark-data_keys_data_input">
                <common-input-text
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
import type { UserBookmark, UserBookmarkPreset } from '~/utils/backend/handlers/bookmarks';
import CommonToggle from '~/components/common/basic/CommonToggle.vue';
import MapFilterColumns from '~/components/map/filters/filters/MapFilterColumns.vue';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import type { SelectItem } from '~/types/components/select';
import CommonSelect from '~/components/common/basic/CommonSelect.vue';
import CommonNotification from '~/components/common/basic/CommonNotification.vue';
import CommonBlockTitle from '~/components/common/blocks/CommonBlockTitle.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
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
        props.bookmark.coords = view.getCenter();
        props.bookmark.zoom = view.getZoom();
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
            code: event.code,
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
