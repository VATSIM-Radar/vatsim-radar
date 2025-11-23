<template>
    <common-popup
        :model-value="!!store.metarRequest"
        width="600px"
        @update:modelValue="store.metarRequest = false"
    >
        <template #title>
            Weather Request
        </template>
        <div class="__info-sections">
            <common-popup
                v-model="copy.copyState.value"
                disabled
            >
                <template #title>
                    Success
                </template>
                Selected data has been copied to clipboard.
            </common-popup>
            <div
                v-if="favorite.length"
                class="metar_favorite"
            >
                <div
                    v-for="airport in favorite"
                    :key="airport"
                    class="metar_favorite_item"
                    :class="{ 'metar_favorite_item--active': list.includes(airport) }"
                    @click="list.includes(airport) ? list = list.filter(x => x !== airport) : list.push(airport)"
                >
                    <div class="metar_favorite_item_title">
                        {{airport}}
                    </div>
                    <common-button
                        class="metar_favorite_item_remove"
                        hover-color="error500"
                        type="link"
                        @click.stop="[favorite = favorite.filter(x => x !== airport), saveFavorite()]"
                    >
                        <template #icon>
                            <star-filled-icon width="14"/>
                        </template>
                    </common-button>
                </div>
                <common-button
                    class="metar_favorite_select"
                    size="S"
                    @click="list = Array.from(new Set([...list, ...favorite]))"
                >
                    Select all
                </common-button>
            </div>
            <form
                class="metar_form"
                @submit.prevent="addAirport"
            >
                <common-input-text
                    ref="input"
                    v-model="newAirport"
                    height="36px"
                    placeholder="Enter ICAO"
                    @update:modelValue="newAirport = newAirport.toUpperCase()"
                />
                <common-button
                    :disabled="isDisabledAirport"
                    size="S"
                    @click="addAirport"
                >
                    Request
                </common-button>
            </form>
            <div class="metar_list __info-sections">
                <div
                    v-for="item in metars"
                    :key="item.icao"
                    class="metar__item"
                >
                    <div class="metar__item_title">
                        <div class="metar__item_title_text">
                            {{item.icao}}
                        </div>
                        <div class="metar__item_title_actions">
                            <common-button
                                hover-color="warning500"
                                type="link"
                                @click="[favorite.includes(item.icao) ? favorite = favorite.filter(x => x !== item.icao) : favorite.push(item.icao), saveFavorite()]"
                            >
                                <template #icon>
                                    <star-filled-icon
                                        v-if="favorite.includes(item.icao)"
                                        width="14"
                                    />
                                    <star-icon
                                        v-else
                                        width="14"
                                    />
                                </template>
                            </common-button>
                            <common-button
                                hover-color="error700"
                                link-color="error500"
                                type="link"
                                @click="list = list.filter(x => x !== item.icao)"
                            >
                                <template #icon>
                                    <close-icon width="12"/>
                                </template>
                            </common-button>
                        </div>
                    </div>
                    <div class="metar__item_body">
                        <div class="metar__item_body_section">
                            <textarea
                                v-if="item.metarRaw"
                                class="metar__item_body_textarea metar__item_body_textarea--metar"
                                readonly
                                :value="item.metarRaw"
                            />
                            <common-button
                                v-if="item.metarRaw"
                                type="link"
                                @click="copy.copy(item.metarRaw)"
                            >
                                Copy
                            </common-button>
                        </div>
                        <div class="metar__item_body_section">
                            <textarea
                                v-if="item.tafRaw"
                                class="metar__item_body_textarea metar__item_body_textarea--taf"
                                readonly
                                :value="item.tafRaw"
                            />
                            <common-button
                                v-if="item.tafRaw"
                                type="link"
                                @click="copy.copy(item.tafRaw)"
                            >
                                Copy
                            </common-button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <template #actions>
            <common-button
                v-if="list.length"
                :disabled="loading"
                @click="[cached = [], refresh()]"
            >
                Refresh
            </common-button>
        </template>
    </common-popup>
</template>

<script setup lang="ts">
import { useStore } from '~/store';
import type { VatsimAirportData } from '~~/server/api/data/vatsim/airport/[icao]';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import StarIcon from '@/assets/icons/kit/star.svg?component';
import StarFilledIcon from '@/assets/icons/kit/star-filled.svg?component';
import CommonInputText from '~/components/common/basic/CommonInputText.vue';
import CloseIcon from '@/assets/icons/basic/close.svg?component';

const store = useStore();
const dataStore = useDataStore();

const newAirport = ref('');
const loading = ref(false);

const favorite = ref<string[]>(JSON.parse(localStorage.getItem('metar-favorite') ?? '[]'));
const list = useCookie<string[]>('metars', {
    path: '/',
    secure: true,
    default: () => [],
});
const cached = ref<VatsimAirportDataIcao[]>([]);

const isDisabledAirport = computed(() => {
    return list.value.includes(newAirport.value) || !dataStore.vatspy.value?.data.keyAirports.realIcao[newAirport.value];
});

function addAirport() {
    if (isDisabledAirport.value) return;

    list.value.push(newAirport.value);
    newAirport.value = '';
}

if (Array.isArray(store.metarRequest)) {
    list.value = store.metarRequest;
}

const copy = useCopyText({ delay: 1500 });
const input = useTemplateRef('input');

onMounted(() => {
    input.value?.$el.querySelector('input')?.focus();
});

function saveFavorite() {
    localStorage.setItem('metar-favorite', JSON.stringify(favorite.value));
}

async function requestAirport(icao: string) {
    const cachedItem = cached.value.find(x => x.icao === icao);

    if (cachedItem) return cachedItem;

    const data = await $fetch<VatsimAirportDataIcao>(`/api/data/vatsim/airport/${ icao }?requestedDataType=1&excludeBookings=1`);
    data.icao = icao;
    cached.value.push(data);
    return data;
}

interface VatsimAirportDataIcao extends VatsimAirportData {
    icao: string;
}

const { data, refresh } = await useLazyAsyncData<VatsimAirportDataIcao[]>('metars', async () => {
    loading.value = true;

    try {
        return await Promise.all(list.value.map(requestAirport));
    }
    finally {
        loading.value = false;
    }
}, {
    watch: [list],
});

const metars = computed(() => {
    const list = data.value ?? [];

    return list.map(airport => ({
        icao: airport.icao,
        metarRaw: airport.metar,
        tafRaw: airport.taf,
    }));
});
</script>

<style scoped lang="scss">
.metar {
    &_form {
        display: flex;
        gap: 16px;
    }

    &_favorite {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;

        &_item {
            cursor: pointer;
            user-select: none;

            display: flex;
            gap: 8px;
            align-items: center;

            padding: 4px 8px;
            border: 1px solid transparent;
            border-radius: 4px;

            font-size: 14px;

            background: $darkgray875;

            transition: 0.3s;

            &--active {
                border-color: $primary500;
            }

            @include hover {
                &:hover {
                    border-color: varToRgba('primary500', 0.5);

                    &.metar_favorite_item--active {
                        border-color: varToRgba('error500', 0.5);
                    }
                }
            }
        }
    }

    &_list {
        padding: 0 4px;
    }

    &__item {
        display: flex;
        flex-direction: column;
        gap: 4px;

        padding: 8px;
        border-radius: 8px;

        background: $darkgray900;

        &_title {
            display: flex;
            gap: 8px;
            align-items: center;

            font-size: 14px;
            font-weight: bold;

            &_text {
                min-width: 40px;
            }

            &_actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }
        }

        &_body {
            display: flex;
            flex-direction: column;
            gap: 4px;

            &_section {
                display: flex;
                gap: 8px;
                align-items: flex-end;
                justify-content: space-between;

                white-space: nowrap;
            }

            &_textarea {
                resize: vertical;

                width: 100%;
                padding: 8px;
                border: none;
                border-radius: 4px;

                font-size: 11px;
                color: $lightgray150;

                appearance: none;
                background: $darkgray850;
                outline: none;
                box-shadow: none;

                field-sizing: normal;
            }
        }
    }
}
</style>
