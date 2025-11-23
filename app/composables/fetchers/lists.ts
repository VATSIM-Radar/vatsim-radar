import type { UserList, UserListLiveUser } from '~/utils/backend/handlers/lists';
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
    const store = useStore();

    const sort = store.user!.settings.favoriteSort ?? 'newest';

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
