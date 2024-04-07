import { defineStore } from 'pinia';
import type { ThemesList } from '~/modules/styles';

export const useStore = defineStore('index', {
    state: () => ({
        theme: 'default' as ThemesList,
    }),
});
