import { defineStore } from 'pinia';
import type { ThemesList } from '~/modules/styles';
import type { FullUser } from '~/utils/backend/user';
import type { UserLocalSettings } from '~/types/map';

export const useStore = defineStore('index', {
    state: () => ({
        theme: 'default' as ThemesList,
        datetime: Date.now(),

        user: null as null | FullUser,
        version: '',
        localSettings: {} as UserLocalSettings,
    }),
});
