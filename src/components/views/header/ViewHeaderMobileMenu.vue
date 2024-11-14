<template>
    <transition name="mobile-menu--appear">
        <div
            v-if="model"
            class="mobile-menu"
        >
            <div class="mobile-menu__stats">
                <div
                    v-for="[title, counter] in counters"
                    :key="title"
                    class="mobile-menu__stats_item"
                >
                    <div class="mobile-menu__stats_item_title">
                        {{ title }}
                    </div>
                    <div class="mobile-menu__stats_item_text">
                        {{ counter }}
                    </div>
                </div>
            </div>
            <div class="__spacer"/>
            <view-header-theme-switcher class="mobile-menu__flex-start"/>
            <div class="mobile-menu__menu">
                <template
                    v-for="button in headerMenu.filter(x => !x.disabled)"
                    :key="button.text"
                >
                    <common-button
                        v-if="!button.children"
                        class="mobile-menu__menu_item"
                        :disabled="button.disabled"
                        text-align="left"
                        :to="button.path"
                        :type="button.active ? 'primary' : 'secondary'"
                        @click="[model = false, button.action?.()]"
                    >
                        <template
                            v-if="button.icon"
                            #icon
                        >
                            <component :is="button.icon"/>
                        </template>

                        {{ button.text }}
                    </common-button>
                    <template v-else>
                        <common-button
                            v-for="childrenButton in button.children"
                            :key="childrenButton.text"
                            class="mobile-menu__menu_item"
                            :disabled="childrenButton.disabled"
                            text-align="left"
                            :to="childrenButton.path"
                            :type="childrenButton.active ? 'primary' : 'secondary'"
                            @click="[model = false, childrenButton.action?.()]"
                        >
                            <template
                                v-if="childrenButton.icon"
                                #icon
                            >
                                <component :is="childrenButton.icon"/>
                            </template>

                            {{ childrenButton.text }}
                        </common-button>
                    </template>
                </template>
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { useHeaderMenu, useOnlineCounters } from '~/composables/navigation';
import CommonButton from '~/components/common/basic/CommonButton.vue';
import ViewHeaderThemeSwitcher from '~/components/views/header/ViewHeaderThemeSwitcher.vue';

const model = defineModel({ type: Boolean, required: true });

const onlineCounters = useOnlineCounters();
const headerMenu = useHeaderMenu();

const counters = computed(() => [
    ['Connections', onlineCounters.value.total],
    ['In VATSIM Radar', onlineCounters.value.inRadar],
    ['Pilots', onlineCounters.value.pilots],
    ['ATC', onlineCounters.value.firs + onlineCounters.value.atc],
    ['Supervisors', onlineCounters.value.sups],
    ['Admins', onlineCounters.value.adm],
].filter(x => x[1]));
</script>

<style scoped lang="scss">
.mobile-menu {
    scrollbar-gutter: stable;

    position: fixed;
    z-index: 50;
    top: 56px;
    left: 8px;

    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;

    width: calc(100% - 16px);
    height: calc(100% - 56px);
    padding: 16px;

    background: $darkgray950;
    border-radius: 16px 16px 0 0;

    &__flex-start {
        align-self: flex-start;
    }

    &--appear {
        &-enter-active,
        &-leave-active {
            transition: 0.3s;
        }

        &-enter-from,
        &-leave-to {
            top: 36px;
            opacity: 0;
        }
    }

    &__stats {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12px;

        &_item {
            display: flex;
            gap: 4px;
            justify-content: space-between;

            padding: 8px;

            background: $darkgray900;
            border-radius: 8px;

            &_title {
                font-weight: 600;
            }
        }
    }

    &__menu {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
}
</style>
