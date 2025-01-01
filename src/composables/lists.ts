import type { UserList } from '~/utils/backend/lists';
import type { UserTrackingListType } from '@prisma/client';
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
    return useStore().user?.lists.find(x => x.users.some(x => x.cid === cid)) ?? null;
}
