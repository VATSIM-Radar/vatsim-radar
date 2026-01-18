<template>
    <ui-page-container
        class="about"
    >
        <div
            class="about_hero"
            :class="{ 'about_hero--light': store.getCurrentTheme === 'light' }"
        >
            <div class="about_hero_title">
                About <span>VATSIM Radar</span>
            </div>
            <div class="about_hero_text">
                VATSIM Radar is the go-to VATSIM Flight Tracker. It is a feature-rich tool that supports your flying or controlling experience!
            </div>
            <div class="about_hero_subtext">
                VATSIM Radar Beta was opened to the public on <span>17 April 2024</span>. That is the same day that Sean Bean turned 66. Coincidence? We think not.
            </div>
            <div class="about_hero_info">
                <div class="about_hero_info_item">
                    <div class="about_hero_info_item_title">
                        Created
                    </div>
                    <div class="about_hero_info_item_text">
                        17 April 2024
                    </div>
                </div>
                <div class="about_hero_info_item">
                    <div class="about_hero_info_item_title">
                        Contact
                    </div>
                    <div class="about_hero_info_item_text">
                        <a href="mailto:dan@vatsim-radar.com">dan@vatsim-radar.com</a>
                    </div>
                </div>
            </div>
        </div>
        <div class="about_list">
            <div class="about_list_title">
                Technology Stack
            </div>
            <div class="about__stack">
                <div class="about__stack_card">
                    <div class="about__stack_card_label">Frontend</div>
                    <div class="about__stack_card_techs">
                        <span>Vue</span>
                        <span>Nuxt</span>
                        <span>OpenLayers</span>
                    </div>
                </div>
                <div class="about__stack_card">
                    <div class="about__stack_card_label">Backend</div>
                    <div class="about__stack_card_techs">
                        <span>Nitro</span>
                        <span>Prisma</span>
                        <span>MySQL</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="about_list">
            <div class="about_list_title">
                The Team
            </div>

            <div class="about__teams_section_label">Core Team</div>
            <div class="about__teams_cards">
                <div class="about__teams_card">
                    <img
                        alt="Danila Rodichkin"
                        class="about__teams_card_avatar"
                        src="https://avatars.githubusercontent.com/u/10450717?v=4"
                    >
                    <div class="about__teams_card_name">Danila Rodichkin</div>
                    <div class="about__teams_card_role">Founder</div>
                    <a
                        class="about__teams_card_link"
                        href="https://github.com/daniluk4000"
                        rel="noopener"
                        target="_blank"
                    >
                        <img
                            alt="GitHub"
                            height="14"
                            src="@/assets/icons/social/github.svg"
                            width="14"
                        >
                    </a>
                </div>

                <div class="about__teams_card">
                    <img
                        alt="Xenia"
                        class="about__teams_card_avatar"
                        src="/people/xenia.jpg"
                    >
                    <div class="about__teams_card_name">Xenia</div>
                    <div class="about__teams_card_role">Lead Designer</div>
                    <a
                        class="about__teams_card_link"
                        href="https://www.behance.net/renelvah"
                        rel="noopener"
                        target="_blank"
                    >
                        <img
                            alt="Behance"
                            height="14"
                            src="@/assets/icons/social/behance.svg"
                            width="14"
                        >
                    </a>
                </div>
            </div>

            <div class="about__teams_section_label">Contributors</div>
            <div class="about__teams_cards">
                <div class="about__teams_card">
                    <img
                        alt="Sergey Lukashenko"
                        class="about__teams_card_avatar"
                        src="/people/serega.jpg"
                    >
                    <div class="about__teams_card_name">Sergey Lukashenko</div>
                    <div class="about__teams_card_role">DevOps</div>
                </div>

                <div class="about__teams_card">
                    <div class="about__teams_card_avatar about__teams_card_avatar--placeholder">
                        IB
                    </div>
                    <div class="about__teams_card_name">Ivan Buev</div>
                    <div class="about__teams_card_role">Developer</div>
                </div>

                <div class="about__teams_card">
                    <img
                        alt="Mats Edvin Aarø"
                        class="about__teams_card_avatar"
                        src="https://avatars.githubusercontent.com/u/79384776?v=4"
                    >
                    <div class="about__teams_card_name">Mats Edvin Aarø</div>
                    <div class="about__teams_card_role">VATSIM Asst. VP Supervisors</div>
                    <a
                        class="about__teams_card_link"
                        href="https://github.com/DotWallop"
                        rel="noopener"
                        target="_blank"
                    >
                        <img
                            alt="GitHub"
                            height="14"
                            src="@/assets/icons/social/github.svg"
                            width="14"
                        >
                    </a>
                </div>

                <div class="about__teams_card">
                    <div class="about__teams_card_avatar about__teams_card_avatar--placeholder">
                        F
                    </div>
                    <div class="about__teams_card_name">Felix</div>
                    <div class="about__teams_card_role">Developer</div>
                    <a
                        class="about__teams_card_link"
                        href="https://github.com/FX5F"
                        rel="noopener"
                        target="_blank"
                    >
                        <img
                            alt="GitHub"
                            height="14"
                            src="@/assets/icons/social/github.svg"
                            width="14"
                        >
                    </a>
                </div>

                <div class="about__teams_card">
                    <img
                        alt="Noah Elijah Till"
                        class="about__teams_card_avatar"
                        src="/people/noah.jpg"
                    >
                    <div class="about__teams_card_name">Noah Elijah Till</div>
                    <div class="about__teams_card_role">Developer</div>
                    <a
                        class="about__teams_card_link"
                        href="https://github.com/MindCollaps"
                        rel="noopener"
                        target="_blank"
                    >
                        <img
                            alt="GitHub"
                            height="14"
                            src="@/assets/icons/social/github.svg"
                            width="14"
                        >
                    </a>
                </div>
            </div>

            <div class="about__support">
                <div class="about__support_content">
                    <div class="about__support_title">
                        Support Us
                    </div>
                    <div class="about__support_text">
                        VATSIM Radar is funded by generous members of the community. Help us keep the service running!
                    </div>
                    <ui-button
                        class="about__support_button"
                        to="/support-us"
                    >
                        Support Us
                    </ui-button>
                </div>
            </div>
        </div>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import { useStore } from '~/store';

useHead({
    title: 'About Us',
});

const store = useStore();
</script>

<style scoped lang="scss">
.about {
    &_hero {
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 24px;
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

        &_title {

            font-size: 40px;
            font-weight: 700;

            span {
                font-weight: 700;
                color: $primary500;
            }

            @include mobile {
                font-size: 24px;
            }
        }

        &_text {
            max-width: 500px;
            font-size: 16px;
            line-height: 1.5;
        }

        &_subtext {
            max-width: 500px;
            font-size: 14px;
            line-height: 1.5;
            color: $lightgray150;

            span {
                font-weight: 600;
                color: $primary500;
            }
        }

        &_info {
            display: flex;
            gap: 48px;

            @include mobile {
                flex-direction: column;
                gap: 24px;
            }

            &_item {
                &_title {
                    margin-bottom: 4px;

                    font-size: 13px;
                    font-weight: 600;
                    color: $lightgray150;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                &_text {
                    font-size: 15px;
                    font-weight: 500;

                    a {
                        color: $primary500;
                        text-decoration: none;

                        &:hover {
                            text-decoration: underline;
                        }
                    }
                }
            }
        }
    }

    &_list {
        margin-top: 24px;

        @include mobile {
            margin-top: 12px;
            padding: 16px;
        }

        &_title {
            margin-bottom: 32px;

            font-size: 32px;
            font-weight: 700;

            @include mobile {
                margin-bottom: 16px;
                font-size: 24px;
            }
        }
    }

    &__stack {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;

        @include mobile {
            grid-template-columns: 1fr;
        }

        &_card {
            padding: 24px;
            border-radius: 8px;
            background: $darkgray900;

            @include mobile {
                padding: 16px;
            }

            &_label {
                margin-bottom: 16px;
                font-size: 17px;
                font-weight: 600;
                color: $lightgray125;

                @include mobile {
                    margin-bottom: 12px;
                    font-size: 15px;
                }
            }

            &_techs {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;

                span {
                    padding: 6px 12px;
                    border-radius: 4px;

                    font-size: 14px;
                    font-weight: 500;
                    color: $primary500;

                    background: $darkgray850;
                }
            }
        }
    }

    &__teams {
        &_section_label {
            margin-bottom: 16px;

            font-size: 13px;
            font-weight: 600;
            color: $lightgray150;
            text-transform: uppercase;
            letter-spacing: 0.5px;

            @include mobile {
                margin-bottom: 12px;
            }
        }

        &_cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 32px;

            @include mobile {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 12px;
                margin-bottom: 24px;
            }
        }

        &_card {
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: center;

            min-height: 200px;
            padding: 24px 16px;
            border: 2px solid transparent;
            border-radius: 8px;

            background: $darkgray900;

            transition: all 0.2s ease;

            @include mobile {
                gap: 10px;
                min-height: 180px;
                padding: 20px 12px;
            }

            &:hover {
                border-color: $primary500;
            }

            &_avatar {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                object-fit: cover;

                @include mobile {
                    width: 56px;
                    height: 56px;
                }

                &--placeholder {
                    display: flex;
                    align-items: center;
                    justify-content: center;

                    font-size: 20px;
                    font-weight: 700;
                    color: $primary500;

                    background: $darkgray800;

                    @include mobile {
                        font-size: 18px;
                    }
                }
            }

            &_name {
                font-size: 15px;
                font-weight: 600;
                line-height: 1.3;
                color: $lightgray125;
                text-align: center;

                @include mobile {
                    font-size: 14px;
                }
            }

            &_role {
                margin-top: -6px;

                font-size: 12px;
                line-height: 1.3;
                color: $lightgray150;
                text-align: center;

                @include mobile {
                    font-size: 11px;
                }
            }

            &_link {
                display: flex;
                align-items: center;
                justify-content: center;

                width: 32px;
                height: 32px;
                margin-top: 4px;
                border-radius: 4px;

                color: $lightgray150;
                text-decoration: none;

                background: $darkgray850;

                transition: all 0.2s;

                @include mobile {
                    width: 28px;
                    height: 28px;
                }

                &:hover {
                    color: $lightgray125;
                    background: $primary500;
                }
            }
        }
    }

    &__support {
        padding: 24px;
        border-radius: 8px;
        background: $darkgray900;

        @include mobile {
            padding: 16px;
        }

        &_content {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        &_title {
            font-size: 17px;
            font-weight: 600;
            color: $lightgray125;

            @include mobile {
                font-size: 15px;
            }
        }

        &_text {
            font-size: 14px;
            line-height: 1.6;
            color: $lightgray150;

            @include mobile {
                font-size: 13px;
            }
        }

        &_button {
            align-self: flex-start;
        }
    }
}
</style>
