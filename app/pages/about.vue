<template>
    <common-page-block
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
            <div class="about__list_container">
                <div class="about__teams">
                    <div class="about__teams_section">
                        <div class="about__teams_section_label">Main Team</div>
                        <div class="about__teams_grid">
                            <div class="about__teams_member">
                                <img
                                    src="https://avatars.githubusercontent.com/u/10450717?v=4"
                                    alt="Danila Rodichkin"
                                    class="about__teams_member_avatar"
                                >
                                <div class="about__teams_member_name">Danila Rodichkin</div>
                                <div class="about__teams_member_role">Founder</div>
                                <a
                                    href="https://github.com/daniluk4000"
                                    target="_blank"
                                    rel="noopener"
                                    class="about__teams_member_link"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                </a>
                            </div>
                            <div class="about__teams_member">
                                <img
                                    src="/people/xenia.jpg"
                                    alt="Xenia"
                                    class="about__teams_member_avatar"
                                >
                                <div class="about__teams_member_name">Xenia</div>
                                <div class="about__teams_member_role">Lead Designer</div>
                                <a
                                    href="https://www.behance.net/renelvah"
                                    target="_blank"
                                    rel="noopener"
                                    class="about__teams_member_link"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14h-8.027c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988h-6.466v-14.967h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zm-3.466-8.988h3.584c2.508 0 2.906-3-.312-3h-3.272v3zm3.391 3h-3.391v3.016h3.341c3.055 0 2.868-3.016.05-3.016z"/>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div class="about__teams_section">
                        <div class="about__teams_section_label">Major Contributors</div>
                        <div class="about__teams_list">
                            <div class="about__teams_contributor">
                                <img
                                    src="/people/serega.jpg"
                                    alt="Sergey Lukashenko"
                                    class="about__teams_contributor_avatar"
                                >
                                <div class="about__teams_contributor_info">
                                    <div class="about__teams_contributor_name">Sergey Lukashenko</div>
                                    <div class="about__teams_contributor_role">DevOps</div>
                                </div>
                            </div>
                            <div class="about__teams_contributor">
                                <div class="about__teams_contributor_avatar about__teams_contributor_avatar--placeholder">
                                    IB
                                </div>
                                <div class="about__teams_contributor_info">
                                    <div class="about__teams_contributor_name">Ivan Buev</div>
                                    <div class="about__teams_contributor_role">Developer</div>
                                </div>
                            </div>
                            <div class="about__teams_contributor">
                                <img
                                    src="https://avatars.githubusercontent.com/u/79384776?v=4"
                                    alt="Mats Edvin Aarø"
                                    class="about__teams_contributor_avatar"
                                >
                                <div class="about__teams_contributor_info">
                                    <div class="about__teams_contributor_name">Mats Edvin Aarø</div>
                                    <div class="about__teams_contributor_role">VATSIM Asst. VP Supervisors</div>
                                </div>
                                <a
                                    href="https://github.com/DotWallop"
                                    target="_blank"
                                    rel="noopener"
                                    class="about__teams_contributor_link"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                </a>
                            </div>
                            <div class="about__teams_contributor">
                                <div class="about__teams_contributor_avatar about__teams_contributor_avatar--placeholder">
                                    F
                                </div>
                                <div class="about__teams_contributor_info">
                                    <div class="about__teams_contributor_name">Felix</div>
                                    <div class="about__teams_contributor_role">Developer</div>
                                </div>
                                <a
                                    href="https://github.com/FX5F"
                                    target="_blank"
                                    rel="noopener"
                                    class="about__teams_contributor_link"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                </a>
                            </div>
                            <div class="about__teams_contributor">
                                <img
                                    src="/people/noah.jpg"
                                    alt="Noah Elijah Till"
                                    class="about__teams_contributor_avatar"
                                >
                                <div class="about__teams_contributor_info">
                                    <div class="about__teams_contributor_name">Noah Elijah Till</div>
                                    <div class="about__teams_contributor_role">Developer</div>
                                </div>
                                <a
                                    href="https://github.com/MindCollaps"
                                    target="_blank"
                                    rel="noopener"
                                    class="about__teams_contributor_link"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="about__list about__list--membership">
                    <div class="about__list_item">
                        <div class="about__list_item_title">
                            Support Us
                        </div>
                        <div class="about__list_item_text">
                            VATSIM Radar is funded by generous members of the community. Help us keep the service running!
                        </div>
                        <common-button
                            href="/support-us"
                            class="about__support_button"
                        >
                            View Patreon Page
                        </common-button>
                    </div>
                </div>
            </div>
        </div>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import { useStore } from '~/store';

useHead({
    title: 'About VATSIM Radar',
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
            font-family: $openSansFont;
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
                gap: 24px;
                flex-direction: column;
            }

            &_item {
                &_title {
                    font-size: 13px;
                    font-weight: 600;
                    color: $lightgray150;
                    margin-bottom: 4px;
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
        margin-top: 32px;
        padding: 48px;

        @include mobile {
            margin-top: 16px;
            padding: 16px;
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
    }

    &__list {
        display: flex;
        flex-direction: column;
        gap: 16px;

        @include mobileOnly {
            gap: 8px;
        }

        &_container {
            display: grid;
            grid-template-columns: 70% 28%;
            gap: 16px;
            align-items: flex-start;

            @media (max-width: 1100px) {
                grid-template-columns: 1fr;
            }
        }

        &--membership {
            @include fromTablet {
                position: sticky;
                top: 70px; // Header height (56px + 16px padding) + spacing (8px)
                align-self: flex-start;
            }
        }

        &_item {
            padding: 16px;
            border-radius: 8px;
            background: $darkgray900;

            @include mobileOnly {
                padding: 12px;
            }

            &--team {
                padding: 24px;

                @include mobileOnly {
                    padding: 16px;
                }
            }

            &_title {
                font-size: 17px;
                font-weight: 600;
                margin-bottom: 16px;

                @include mobileOnly {
                    font-size: 15px;
                    margin-bottom: 12px;
                }
            }

            &_text {
                font-size: 14px;
                line-height: 1.6;
                color: $lightgray150;
                margin-bottom: 16px;
            }

            &_list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;

                &_tech {
                    padding: 6px 12px;
                    border-radius: 4px;
                    background: $darkgray850;
                    font-size: 13px;
                    font-weight: 500;
                }
            }
        }
    }

    &__team {
        display: flex;
        flex-direction: column;
        gap: 12px;

        &_member {
            display: flex;
            gap: 12px;
            align-items: center;
            padding: 12px;
            border-radius: 6px;
            background: $darkgray850;
            transition: background 0.2s;

            &:hover {
                background: $darkgray800;
            }

            &_avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: cover;
                flex-shrink: 0;

                &--placeholder {
                    background: $darkgray800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 700;
                    color: $primary500;
                }
            }

            &_info {
                flex: 1;
                min-width: 0;
            }

            &_name {
                font-size: 14px;
                font-weight: 600;
                color: $lightgray125;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            &_role {
                font-size: 12px;
                color: $lightgray150;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            &_link {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border-radius: 4px;
                background: $darkgray900;
                color: $lightgray150;
                text-decoration: none;
                transition: all 0.2s;
                flex-shrink: 0;

                &:hover {
                    background: $primary500;
                    color: $lightgray125;
                }
            }
        }
    }

    &__support_button {
        margin-top: 12px;
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
                font-size: 17px;
                font-weight: 600;
                color: $lightgray125;
                margin-bottom: 16px;

                @include mobile {
                    font-size: 15px;
                    margin-bottom: 12px;
                }
            }

            &_techs {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;

                span {
                    padding: 6px 12px;
                    border-radius: 4px;
                    background: $darkgray850;
                    font-size: 14px;
                    font-weight: 500;
                    color: $primary500;
                }
            }
        }
    }

    &__teams {
        display: flex;
        flex-direction: column;
        gap: 24px;

        &_section {
            padding: 24px;
            border-radius: 8px;
            background: $darkgray900;

            @include mobile {
                padding: 16px;
            }

            &_label {
                font-size: 13px;
                font-weight: 600;
                color: $lightgray150;
                margin-bottom: 16px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
        }

        &_grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;

            @include mobile {
                grid-template-columns: 1fr;
            }
        }

        &_member {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            padding: 24px 16px;
            text-align: center;

            &_avatar {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                object-fit: cover;

                &--placeholder {
                    background: $darkgray800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: 700;
                    color: $primary500;
                }
            }

            &_name {
                font-size: 15px;
                font-weight: 600;
                color: $lightgray125;
            }

            &_role {
                font-size: 12px;
                color: $lightgray150;
                margin-top: -8px;
            }

            &_link {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                margin-top: 4px;
                border-radius: 4px;
                background: $darkgray900;
                color: $lightgray150;
                text-decoration: none;
                transition: all 0.2s;

                &:hover {
                    background: $primary500;
                    color: $lightgray125;
                }
            }
        }

        &_list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        &_contributor {
            display: flex;
            gap: 12px;
            align-items: center;
            padding: 12px;

            &_avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                object-fit: cover;
                flex-shrink: 0;

                &--placeholder {
                    background: $darkgray800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                    color: $primary500;
                }
            }

            &_info {
                flex: 1;
                min-width: 0;
            }

            &_name {
                font-size: 14px;
                font-weight: 600;
                color: $lightgray125;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            &_role {
                font-size: 11px;
                color: $lightgray150;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            &_link {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                border-radius: 4px;
                background: $darkgray900;
                color: $lightgray150;
                text-decoration: none;
                transition: all 0.2s;
                flex-shrink: 0;

                &:hover {
                    background: $primary500;
                    color: $lightgray125;
                }
            }
        }
    }
}
</style>