import type { UserList, UserListLiveUser } from '~/utils/server/handlers/lists';
import type { UserTrackingListType } from '#prisma';
import { useStore } from '~/store';

type AddUserListOther = Omit<UserList, 'type' | 'id'>;
type AddUserListFriends = Omit<UserList, 'id' | 'color'> & { type: typeof UserTrackingListType.FRIENDS; color?: string };

function getListWithExcludedUsers<T extends Partial<UserList>>(list: T): T {
    if (!list.users) return list;

    return {
        ...list,
        users: list.users.map(user => ({
            cid: user.cid,
            name: user.name,
            comment: user.comment,
        })),
    };
}

export async function addUserList(list: AddUserListOther | AddUserListFriends) {
    const store = useStore();

    const result = await $fetch('/api/user/lists', {
        method: 'POST',
        body: getListWithExcludedUsers(list),
    });
    await store.refreshUser();

    return result;
}

export async function editUserList(list: Partial<UserList> & { id: number }, update = true) {
    if (list.id === 0) return addUserList(list as UserList);

    const store = useStore();

    const result = await $fetch(`/api/user/lists/${ list.id }`, {
        method: 'PUT',
        body: getListWithExcludedUsers(list),
    });

    if (update) {
        await store.refreshUser();
    }

    return result;
}

export async function deleteUserList(list: Partial<UserList> & { id: number }) {
    const store = useStore();

    const result = await $fetch(`/api/user/lists/${ list.id }`, {
        method: 'DELETE',
    });
    await store.refreshUser();

    return result;
}

export function getUserList(cid: number): UserList | null {
    const store = useStore();
    return store.user?.lists.find(x => x.users.some(x => x.cid === cid && (!x.private || store.user?.isSup))) ?? null;
}

export function sortList(users: UserListLiveUser[]) {
    const sort = getKeyedValueFromSettings('appearance.favoriteSort');

    if (sort === 'oldest') {
        return users.slice(0).reverse().sort((a, b) => {
            const aOnline = a.type !== 'offline';
            const bOnline = b.type !== 'offline';

            if (bOnline && !aOnline) return 1;
            if (!bOnline && aOnline) return -1;

            return 0;
        });
    }

    return users.slice(0).sort((a, b) => {
        const aOnline = a.type !== 'offline';
        const bOnline = b.type !== 'offline';

        if (bOnline && !aOnline) return 1;
        if (!bOnline && aOnline) return -1;

        switch (sort) {
            case 'abcAsc':
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            case 'abcDesc':
                return b.name.localeCompare(a.name, undefined, { numeric: true });
            case 'cidAsc':
                return a.cid - b.cid;
            case 'cidDesc':
                return b.cid - a.cid;
        }

        return 0;
    });
}

export async function setPrivateMode(expiration: '1h' | '3h' | '6h' | '12h' | '24h' | '7d' | null | false) {
    const store = useStore();

    if (expiration === false) {
        await $fetch('/api/user/private', {
            method: 'POST',
            body: {
                date: null,
                enabled: false,
            },
        });

        store.user!.privateMode = false;

        return;
    }

    let date: number | null = null;
    const currentDate = new Date();

    switch (expiration) {
        case '1h':
            date = currentDate.setHours(currentDate.getHours() + 1);
            break;
        case '3h':
            date = currentDate.setHours(currentDate.getHours() + 3);
            break;
        case '6h':
            date = currentDate.setHours(currentDate.getHours() + 6);
            break;
        case '12h':
            date = currentDate.setHours(currentDate.getHours() + 12);
            break;
        case '24h':
            date = currentDate.setHours(currentDate.getHours() + 24);
            break;
        case '7d':
            date = currentDate.setDate(currentDate.getDate() + 24);
            break;
    }

    await $fetch('/api/user/private', {
        method: 'POST',
        body: {
            date: date ? new Date(date).toISOString() : date,
            enabled: true,
        },
    });

    store.user!.privateMode = true;
    store.user!.privateUntil = date !== null ? new Date(date).toISOString() : date;
}
