import { defineStore } from 'pinia';
import type { FullUser } from '~/utils/backend/user';
import type { UserLocalSettings } from '~/types/map';
import type { ThemesList } from '~/modules/styles';

export const useStore = defineStore('index', {
    state: () => ({
        datetime: Date.now(),

        user: null as null | FullUser,
        version: '',
        theme: 'default' as ThemesList,
        localSettings: {} as UserLocalSettings,
    }),
});
