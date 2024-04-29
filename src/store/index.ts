import { defineStore } from 'pinia';
import type { FullUser } from '~/utils/backend/user';
import type { UserLocalSettings } from '~/types/map';

export const useStore = defineStore('index', {
    state: () => ({
        datetime: Date.now(),

        user: null as null | FullUser,
        version: '',
        localSettings: {} as UserLocalSettings,
    }),
});
