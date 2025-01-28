<template>
    <common-page-block
        v-if="data"
        class="support"
    >
        <div
            class="support_hero"
            :class="{ 'support_hero--light': store.getCurrentTheme === 'light' }"
        >
            <div class="support_hero_title">
                Support <span>VATSIM Radar</span><br>
                on <span>Patreon</span> or <span>Boosty</span>
            </div>
            <div class="support_hero_text">
                Our financial goals are to keep <span>VATSIM Radar</span> stable, no matter how it grows. Currently, we need money for <span>DigitalOcean</span> servers, as well as <span>CloudFlare</span> services.<br><br>
                In future, we may buy some existing features and pay for more services that we may need to improve <span>VATSIM Radar</span>.
            </div>
            <div class="support_hero_stats">
                <div class="support_hero_stats_item">
                    <div class="support_hero_stats_item_title">
                        {{ data.all }}
                    </div>
                    <div class="support_hero_stats_item_subtitle">
                        Total Members
                    </div>
                </div>
                <div class="support_hero_stats_item">
                    <div class="support_hero_stats_item_title">
                        {{ data.paid }}
                    </div>
                    <div class="support_hero_stats_item_subtitle">
                        Paid Members
                    </div>
                </div>
                <div class="support_hero_stats_item">
                    <div class="support_hero_stats_item_title">
                        {{ Math.floor(data.budget) }}$
                    </div>
                    <div class="support_hero_stats_item_subtitle">
                        Monthly Budget
                    </div>
                </div>
            </div>
            <div  class="support_hero_cta">
                <common-button
                    href="https://patreon.com/vatsimradar24"
                    target="_blank"
                >
                    Become a Supporter on Patreon
                </common-button>
                <common-button
                    href="https://boosty.to/vatsimradar24"
                    target="_blank"
                    type="secondary-875"
                >
                    Support us on Boosty
                </common-button>
            </div>
        </div>
        <div class="support_list">
            <div class="support_list_title">
                Our Patreon Supporters
            </div>
            <div class="support_list_container">
                <div class="support__list">
                    <div
                        v-for="feature in features"
                        :key="feature.key"
                        class="support__list_item"
                        :class="[`support__list_item--type-${ feature.key }`]"
                    >
                        <div class="support__list_item_title">
                            <common-bubble class="support__list_item_title_count">
                                {{feature.patrons.value.length}}
                            </common-bubble>
                            <div class="support__list_item_title_text">
                                {{feature.title}}
                            </div>
                        </div>
                        <div
                            v-if="!feature.patrons.value.length"
                            class="support__list_item_message"
                        >
                            This level costs {{feature.cost}}$. No wonder no one bought it!
                        </div>
                        <div
                            v-else
                            class="support__list_item_list"
                        >
                            <div
                                v-for="patron in feature.patrons.value"
                                :key="patron"
                                class="support__list_item_list_supporter"
                            >
                                {{patron}}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="support__list support__list--membership">
                    <div class="support__list_item">
                        <div class="support__list_item_title">
                            Membership bonuses
                        </div>
                        <ul class="support__list_item_list">
                            <li>
                                Support our development
                            </li>
                            <li>
                                Beta versions access
                            </li>
                            <li>
                                Esri Satellite Layer
                            </li>
                            <li>
                                Name on this page (Patreon only)
                            </li>
                            <li>
                                Telegram Chat (Boosty only)
                            </li>
                            <li>
                                More in future...
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div></common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import type { PatreonInfo } from '~/server/plugins/patreon';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import CommonBubble from '~/components/common/basic/CommonBubble.vue';
import { useStore } from '~/store';

useHead({
    title: 'Support VATSIM Radar',
});

const store = useStore();

interface Feature {
    id: string;
    key: string;
    title: string;
    cost: number;
    patrons: ComputedRef<string[]>;
}

const { data } = await useAsyncData('support-us', async () => {
    try {
        const data = await $fetch<null | PatreonInfo>('/api/data/patreon');
        if (!data) {
            showError({
                statusCode: 404,
            });
            return;
        }

        return data;
    }
    catch (e) {
        console.error(e);
        showError({
            statusCode: 500,
        });
    }
});

const getPatronForFeature = (id: string) => computed(() => data.value?.highlighted.filter(x => x.levelId === id).map(x => x.name) ?? []);

const features: Feature[] = [
    {
        id: '23172665',
        key: 'instructor',
        title: 'Radar Senior Instructor',
        cost: 50,
        patrons: getPatronForFeature('23172665'),
    },
    {
        id: '23172660',
        key: 'examiner',
        title: 'Features Examiner',
        cost: 20,
        patrons: getPatronForFeature('23172660'),
    },
    {
        id: '23172646',
        key: 'commercial',
        title: 'Commercial Radar License',
        cost: 10,
        patrons: getPatronForFeature('23172646'),
    },
    {
        id: '23172635',
        key: 'private',
        title: 'Private Radar License',
        cost: 5,
        patrons: getPatronForFeature('23172635'),
    },
];
</script>

<style scoped lang="scss">
.support {
    &_hero {
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 48px;
        align-items: flex-start;

        padding: 48px;
        border-radius: 8px;

        color: $lightgray125;

        background: url("@/assets/images/support-us-bg.png") center / cover;

        &--light {
            background-image: url("@/assets/images/support-us-bg-light.png");
        }

        @include mobile {
            gap: 16px;
            padding: 16px;
        }

        &_title, &_text {
            span {
                font-weight: 700;
                color: $primary500;
            }
        }

        &_title {
            font-family: $openSansFont;
            font-size: 40px;
            font-weight: 700;

            @include mobile {
                font-size: 24px;
            }
        }

        &_text {
            max-width: 500px;
        }

        &_stats {
            display: flex;
            gap: 80px;
            align-items: center;
            text-align: center;

            @include mobileOnly {
                gap: 24px;
            }

            &_item {
                position: relative;

                @include fromTablet {
                    &:not(:last-child)::after {
                        content: '';

                        position: absolute;
                        top: calc(50% - 12px);
                        left: calc(100% + 40px);

                        width: 1px;
                        height: 24px;

                        background: varToRgba('lightgray150', 0.15);
                    }
                }

                &_title {
                    margin-bottom: 8px;

                    font-size: 42px;
                    font-weight: 700;
                    line-height: 100%;
                    color: $primary500;

                    @include mobile {
                        font-size: 24px;
                    }
                }

                &_subtitle {
                    font-size: 15px;
                    font-weight: 500;

                    @include mobile {
                        font-size: 12px;
                    }
                }
            }
        }

        &_cta {
            display: flex;
            gap: 8px;

            @include mobileOnly {
                flex-direction: column;
            }
        }
    }

    &_list {
        margin-top: 32px;
        padding: 48px;

        @include mobile {
            margin-top: 16px;
            padding: 0;
        }

        &_title {
            margin-bottom: 32px;
            font-family: $openSansFont;
            font-size: 32px;
            font-weight: 700;

            @include mobile {
                margin-bottom: 16px;
                font-size: 24px;
            }
        }

        &_container {
            container-name: support-list;
            display: grid;
            grid-template-columns: 70% 25%;
            align-items: flex-start;
            justify-content: space-between;

            @media (max-width: 1100px) {
                display: flex;
                flex-direction: column;
                gap: 8px;
                align-items: stretch;
            }
        }
    }

    &__list {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 24px;

        @include mobileOnly {
            gap: 8px;
        }

        @include fromTablet {
            &--membership {
                position: sticky;
                top: 20px;

                &::after {
                    content: '';

                    position: absolute;
                    left: -2.25cqi;

                    width: 1px;
                    height: 100%;

                    background: varToRgba('lightgray150', 0.15);
                }
            }
        }

        &_item {
            padding: 16px;
            border-radius: 8px;

            font-size: 15px;
            font-weight: 600;

            background: $darkgray900;

            @include mobileOnly {
                font-size: 13px;
            }

            &--type-instructor {
                --gradient: linear-gradient(90deg, #984EF9 0%, #DA5525 60%, #EAC453 100%);
                --color: #{$info300};
            }

            &--type-examiner {
                --gradient: linear-gradient(90deg, #ECD15B 0%, #DA5525 100%);
                --color: #{$warning700};
            }

            &--type-commercial {
                --gradient: linear-gradient(90deg, #05AD5C 0%, #006649 100%);
                --color: #{$success500};
            }

            &--type-private {
                --gradient: linear-gradient(90deg, #3B6CEC 0%, #174ACF 100%);
                --color: #{$primary500};
            }

            &_title {
                display: flex;
                gap: 24px;
                align-items: center;

                margin-bottom: 16px;
                padding-bottom: 16px;
                border-bottom: 1px solid $darkgray850;

                & .bubble {
                    background: var(--color);
                }

            }

            &:not([class*='support__list_item--type']) .support__list_item_title {
                font-size: 17px;
                font-weight: 400;
            }

            &[class*='support__list_item--type'] .support__list_item_title {
                font-size: 24px;
                font-weight: 700;

                @include mobileOnly {
                    font-size: 17px;
                }

                .support__list_item_title_text {
                    background: var(--gradient);
                    background-clip: text;

                    -webkit-text-fill-color: transparent;
                }
            }

            &_list {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;

                @include mobileOnly {
                    gap: 8px;
                }
            }

            ul.support__list_item_list {
                flex-direction: column;
            }
        }
    }
}
</style>
