<template>
    <common-page-block>
        <template #title>
            Privacy Policy
        </template>

        <ol>
            <li>
                General terms

                <ol>
                    <li>
                        All described below belongs to service located on vatsim-radar.com and it's subdomains
                    </li>
                    <li>
                        Services on this domain and subdomains would be described from later on as Vatsim Radar
                    </li>
                    <li>
                        This Privacy Policy was last updated on 15 April 2024 (revision 1)
                    </li>
                    <li>
                        User agrees to Privacy Policy by using Vatsim Radar
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
                        Vatsim Radar may store your data in persistent DataBase after linking of Vatsim and/or Navigraph accounts
                    </li>
                    <li>
                        Personal data, stored by Vatsim Radar, includes:

                        <ol>
                            <li>
                                Vatsim user info: account token, ID and full name
                            </li>
                            <li>
                                Navigraph user info: account token, ID and Navigraph Ultimate subscription status
                            </li>
                            <li>
                                User's preferences, including, but not limited to, Settings, Favourite users, Filters, and other non-3rd party related preferences
                            </li>
                            <li>
                                User's preferences data does not include behaviour tracking and does not include any information that may be used to analyze user's identity
                            </li>
                        </ol>
                    </li>
                </ol>
            </li>
            <li>
                Browser stored data

                <ol>
                    <li>
                        Vatsim Radar may use Cookie, Local Storage or other browser features
                    </li>
                    <li>
                        Data, stored in browser, includes, but not limited to, authorization token, preferences (examples: selected filters, map layers, last map position, e.t.c.)
                    </li>
                </ol>
            </li>
            <li>
                3-rd party data sharing

                <ol>
                    <li>
                        Vatsim Radar does not share any data, described in 2. and 3. with any external service
                    </li>
                    <li>
                        Vatsim Radar does not include any analytics scripts or hidden pixels that can be used to track user
                    </li>
                    <li>
                        All personal data can not be accessed via API, excluding accessing his own data by authorized user
                    </li>
                </ol>
            </li>
            <li>
                Data Deletion

                <ol>
                    <li>
                        User may delete Persistent stored data, described in 2., by using Delete Account button in Vatsim Radar Settings
                    </li>
                    <li>
                        Data will be automatically permanently deleted withing 24 hours from deletion request
                    </li>
                    <li>
                        User can't disallow using of Browser stored data, such as Cookies, since they are required for Vatsim Radar operation
                    </li>
                    <li>
                        In order for service to operate normally, JavaScript shall not be disabled
                    </li>
                    <li>
                        User agrees to storing of his data by using Vatsim Radar
                    </li>
                </ol>
            </li>
        </ol>
    </common-page-block>
</template>

<script setup lang="ts">
useHead({
    title: 'Privacy Policy',
});
</script>
