import { useQuery, useMutation } from '@tanstack/react-query';
import fetchApi from '@/lib/fetch-api';
import { queryKeys } from '@/lib/query-keys';

export interface UserAccount {
    account: { id: string; name: string; status: string };
    role: string;
}

export function useUserAccounts() {
    return useQuery({
        queryKey: queryKeys.auth.userAccounts(),
        queryFn: async (): Promise<UserAccount[]> => {
            const res = await fetchApi('user/accounts');
            if (!res.ok) throw new Error(res.message || 'Erro ao carregar contas');
            return res.accounts;
        }
    });
}

export function useUpdateProfile() {
    return useMutation({
        mutationFn: async (data: { name: string; email: string }) => {
            const res = await fetchApi('user/update-profile', data, 'POST');
            if (!res.ok) throw new Error(res.message || 'Erro ao atualizar perfil');
            return res;
        }
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: async (data: { current_password: string; new_password: string }) => {
            const res = await fetchApi('user/change-password', data, 'POST');
            if (!res.ok) throw new Error(res.message || 'Erro ao alterar senha');
            return res;
        }
    });
}

export function useUploadAvatar() {
    return useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await fetchApi('user/avatar', formData, 'POST');
            if (!res.ok) throw new Error(res.message || 'Erro ao enviar foto');
            return res;
        }
    });
}

export function useDeleteAvatar() {
    return useMutation({
        mutationFn: async () => {
            const res = await fetchApi('user/avatar', null, 'DELETE');
            if (!res.ok) throw new Error(res.message || 'Erro ao remover foto');
            return res;
        }
    });
}
