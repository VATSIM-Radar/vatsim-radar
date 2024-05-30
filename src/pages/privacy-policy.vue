<template>
    <common-page-block>
        <template #title>
            Privacy Policy
        </template>

        Please visit <nuxt-link to="/about">
            About Page
        </nuxt-link> to know more about service goals and used libraries & data.

        <ol>
            <li>
                General terms

                <ol>
                    <li>
                        All described below belongs to service located on vatsim-radar.com and it's subdomains
                    </li>
                    <li>
                        Services on this domain and subdomains would be described from later on as VATSIM Radar
                    </li>
                    <li>
                        This Privacy Policy was last updated on 21 April 2024 (revision 2)
                    </li>
                    <li>
                        User agrees to Privacy Policy by using VATSIM Radar
                    </li>
                    <li>
                        Privacy Policy updates will be listed on this section with updated date and revision number
                    </li>
                </ol>
            </li>
            <li>
                Persistent stored data

                <ol>
                    <li>
                        VATSIM Radar may store your data in persistent DataBase after linking of VATSIM, Navigraph and
                        Discord accounts
                    </li>
                    <li>
                        Personal data, stored by VATSIM Radar, includes:

                        <ol>
                            <li>
                                VATSIM user info: account token, ID and full name
                            </li>
                            <li>
                                Navigraph user info: account token, ID and Navigraph subscription status
                            </li>
                            <li>
                                Discord user info: ID and relation with VATSIM account
                            </li>
                            <li>
                                User's preferences, including, but not limited to, Settings, Favourite users, Filters,
                                and other non-3rd party related preferences
                            </li>
                            <li>
                                User's preferences data does not include behaviour tracking and does not include any
                                information that may be used to analyze user's identity
                            </li>
                        </ol>
                    </li>
                </ol>
            </li>
            <li>
                Browser stored data

                <ol>
                    <li>
                        VATSIM Radar may use Cookie, Local Storage or other browser features
                    </li>
                    <li>
                        Data, stored in browser, includes, but not limited to, authorization token, preferences
                        (examples: selected filters, map layers, last map position, e.t.c.)
                    </li>
                </ol>
            </li>
            <li>
                3-rd party data sharing

                <ol>
                    <li>
                        VATSIM Radar does not share any data, described in 2. and 3. with any external service
                    </li>
                    <li>
                        VATSIM Radar does not include any analytics scripts or hidden pixels that can be used to track
                        user
                    </li>
                    <li>
                        All personal data can not be accessed via API, excluding accessing his own data by authorized
                        user
                    </li>
                </ol>
            </li>
            <li>
                Data Deletion

                <ol>
                    <li>
                        User may delete Persistent stored data, described in 2., by using Delete Account button in
                        VATSIM Radar Settings
                    </li>
                    <li>
                        Data will be automatically permanently deleted withing 24 hours from deletion request
                    </li>
                    <li>
                        User can't disallow using of Browser stored data, such as Cookies, since they are required for
                        VATSIM Radar operation
                    </li>
                    <li>
                        In order for service to operate normally, JavaScript shall not be disabled
                    </li>
                    <li>
                        User agrees to storing of his data by using VATSIM Radar
                    </li>
                    <li>
                        VATSIM Radar will also comply with deletion requests that was initialized by users of 3rd party
                        systems which data is
                        stored in Persistent Database, such as VATSIM, Navigraph or Discord, within 30 days from their
                        request
                    </li>
                    <li>
                        When deletion request was received from VATSIM, or user has decided to delete his account using Delete Account button, VATSIM Radar will also delete all of user's stored
                        data, including preferences and 3rd party account connections, because they are related to this VATSIM Account
                    </li>
                </ol>
            </li>
        </ol>
    </common-page-block>
</template>

<script setup lang="ts">
import CommonPageBlock from '~/components/common/blocks/CommonPageBlock.vue';

useHead({
    title: 'Privacy Policy',
});
</script>
