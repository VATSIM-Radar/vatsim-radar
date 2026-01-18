<template>
    <ui-page-container class="privacy-policy">
        <div
            class="privacy-policy_hero"
            :class="{ 'privacy-policy_hero--light': store.getCurrentTheme === 'light' }"
        >
            <div class="privacy-policy_hero_title">
                Privacy <span>Policy</span>
            </div>
            <div class="privacy-policy_hero_text">
                Your privacy matters to us. Learn how <span>VATSIM Radar</span> handles your data with transparency and respect.
            </div>
            <div class="privacy-policy_hero_contact">
                <div class="privacy-policy_hero_contact_label">
                    Contact Email:
                </div>
                <a
                    class="privacy-policy_hero_contact_link"
                    href="mailto:dan@vatsim-radar.com"
                >
                    dan@vatsim-radar.com
                </a>
            </div>
        </div>

        <div class="privacy-policy_content">

            <ol>
                <li>
                    <div class="privacy-policy_section">
                        <div class="privacy-policy_section_title">General terms</div>
                        <ol>
                            <li>
                                All described below belongs to service located on <span>vatsim-radar.com</span> and it's subdomains
                            </li>
                            <li>
                                Services on this domain and subdomains would be described from later on as <span>VATSIM Radar</span>
                            </li>
                            <li>
                                This Privacy Policy was last updated on <span>29 March 2025</span> (revision 4)
                            </li>
                            <li>
                                User agrees to Privacy Policy by using <span>VATSIM Radar</span>
                            </li>
                            <li>
                                Privacy Policy updates will be listed on this section with updated date and revision number
                            </li>
                        </ol>
                    </div>
                </li>
                <li>
                    <div class="privacy-policy_section">
                        <div class="privacy-policy_section_title">Persistent stored data</div>
                        <ol>
                            <li>
                                <span>VATSIM Radar</span> may store your data in persistent DataBase after linking of VATSIM, Navigraph, and other accounts, listed below in clause 2.2.
                            </li>
                            <li>
                                Personal data, stored by <span>VATSIM Radar</span>, includes:

                                <ol>
                                    <li>
                                        <span>VATSIM</span> user info: account token, ID and full name
                                    </li>
                                    <li>
                                        <span>Navigraph</span> user info: account token, ID and Navigraph subscription status
                                    </li>
                                    <li>
                                        <span>Discord</span> user info: ID and relation with VATSIM account
                                    </li>
                                    <li>
                                        <span>Patreon</span> user info: ID, nickname and relation with VATSIM account
                                    </li>
                                    <li>
                                        <span>Twitch</span> user info: ID, nickname and relation with VATSIM account
                                    </li>
                                    <li>
                                        User's preferences, including, but not limited to, Settings, Favorite users, Filters,
                                        and other non-3rd party related preferences
                                    </li>
                                </ol>
                            </li>
                            <li>
                                User's personal data does not include behaviour tracking and does not include any
                                information that may be used to analyze user's identity
                            </li>
                            <li>
                                User's personal data may also be stored in private containers in <span>CloudFlare</span> and <span>DigitalOcean</span> for backups purposes
                            </li>
                        </ol>
                    </div>
                </li>
                <li>
                    <div class="privacy-policy_section">
                        <div class="privacy-policy_section_title">Browser stored data</div>
                        <ol>
                            <li>
                                <span>VATSIM Radar</span> may use Cookie, Local Storage or other browser storing features
                            </li>
                            <li>
                                Data, stored in browser, includes, but not limited to, authorization token, preferences
                                (examples: selected filters, map layers, last map position, e.t.c.)
                            </li>
                        </ol>
                    </div>
                </li>
                <li>
                    <div class="privacy-policy_section">
                        <div class="privacy-policy_section_title">3-rd party data sharing</div>
                        <ol>
                            <li>
                                <span>VATSIM Radar</span> does not share any data, described in 2. and 3. with any external service
                            </li>
                            <li>
                                <span>VATSIM Radar</span> does not include any other analytics scripts or hidden pixels that can be used to track
                                user without explicit notice via Data Policy Popup
                            </li>
                            <li>
                                All personal data can not be accessed via API, excluding accessing his own data by authorized
                                user
                            </li>
                        </ol>
                    </div>
                </li>
                <li>
                    <div class="privacy-policy_section">
                        <div class="privacy-policy_section_title">Data Deletion</div>
                        <ol>
                            <li>
                                User may delete Persistent stored data, described in 2., by using <span>Delete Account</span> button in
                                <span>VATSIM Radar Settings</span>
                            </li>
                            <li>
                                Data will be automatically permanently deleted withing <span>7 days</span> from deletion request, including 3rd party backups and snapshots
                            </li>
                            <li>
                                User can't disallow using of Browser stored data, such as Cookies, since they are required for
                                <span>VATSIM Radar</span> operation
                            </li>
                            <li>
                                In order for service to operate normally, JavaScript shall not be disabled
                            </li>
                            <li>
                                User agrees to storing of his data by using <span>VATSIM Radar</span>
                            </li>
                            <li>
                                <span>VATSIM Radar</span> will also comply with deletion requests that was initialized by users of 3rd party
                                systems which data is
                                stored in Persistent Database, such as VATSIM, Navigraph or Discord, within <span>30 days</span> from their
                                request
                            </li>
                            <li>
                                When deletion request was received from VATSIM, or user has decided to delete his account using Delete Account button, <span>VATSIM Radar</span> will also delete all of user's stored
                                data, including preferences and 3rd party account connections, because they are related to this VATSIM Account
                            </li>
                        </ol>
                    </div>
                </li>
            </ol>
        </div>
    </ui-page-container>
</template>

<script setup lang="ts">
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import { useStore } from '~/store';

useHead({
    title: 'Privacy Policy',
});

const store = useStore();
</script>

<style scoped lang="scss">
.privacy-policy {
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

        &_title, &_text, &_contact {
            span {
                font-weight: 700;
                color: $primary500;
            }
        }

        &_title {

            font-size: 40px;
            font-weight: 700;

            @include mobile {
                font-size: 24px;
            }
        }

        &_text {
            max-width: 600px;
            font-size: 16px;
            line-height: 1.6;
        }

        &_contact {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;

            font-size: 15px;

            &_label {
                font-weight: 500;
            }

            &_link {
                font-weight: 600;
                color: $primary500;
                text-decoration: none;
                transition: color 0.2s;

                &:hover {
                    color: $primary400;
                    text-decoration: underline;
                }
            }
        }
    }

    &_content {
        margin-top: 32px;

        @include mobile {
            margin-top: 16px;
            padding: 16px;
        }

        > ol {
            counter-reset: section-counter;

            display: flex;
            flex-direction: column;
            gap: 32px;

            padding: 0;

            list-style: none;

            @include mobile {
                gap: 24px;
            }

            > li {
                counter-increment: section-counter;

                &::before {
                    content: counter(section-counter) ".";

                    position: absolute;
                    left: -40px;

                    font-size: 20px;
                    font-weight: 700;
                    color: $primary500;

                    @include mobile {
                        position: static;
                        display: block;
                        margin-bottom: 8px;
                    }
                }
            }
        }
    }

    &_section {
        position: relative;
        padding: 24px;
        border-radius: 8px;
        background: $darkgray900;

        @include mobile {
            padding: 16px;
        }

        &_title {
            margin-bottom: 16px;


            font-size: 24px;
            font-weight: 700;
            color: $lightgray125;

            @include mobile {
                font-size: 20px;
            }
        }

        ol {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding-left: 24px;

            @include mobile {
                padding-left: 20px;
            }

            li {
                font-size: 15px;
                line-height: 1.6;
                color: $lightgray150;

                @include mobile {
                    font-size: 14px;
                }

                span {
                    font-weight: 600;
                    color: $primary500;
                }

                ol {
                    margin-top: 12px;
                }
            }
        }
    }
}
</style>
