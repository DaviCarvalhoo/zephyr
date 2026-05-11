import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import fetchApi from '@/lib/fetch-api';
import { queryKeys, type PaginationFilters } from '@/lib/query-keys';

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    utc_created_on: string;
    accounts: { id: string; name: string; role: string }[];
}

export interface UsersResponse {
    ok: boolean;
    rows: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function useUsers(filters: PaginationFilters) {
    return useQuery({
        queryKey: queryKeys.users.list(filters),
        placeholderData: keepPreviousData,
        queryFn: async (): Promise<UsersResponse> => {
            const params: Record<string, string> = {};
            if (filters.page) params.page = String(filters.page);
            if (filters.limit) params.limit = String(filters.limit);
            if (filters.search) params.search = filters.search;

            const res = await fetchApi('admin/users', params);
            if (!res.ok) throw new Error(res.message || 'Erro ao carregar usuários');
            return res;
        }
    });
}

export interface CreateUserData {
    name: string;
    email: string;
    password: string;
    role: string;
}

export function useCreateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateUserData) => {
            const res = await fetchApi('admin/users', data, 'POST');
            if (!res.ok) throw new Error(res.message || 'Erro ao criar usuário');
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.admin() });
        }
    });
}

export interface UpdateUserData {
    name: string;
    email: string;
    role?: string;
    password?: string;
}

export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateUserData }) => {
            const res = await fetchApi(`admin/users/${id}`, data, 'POST');
            if (!res.ok) throw new Error(res.message || 'Erro ao atualizar usuário');
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
        }
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetchApi(`admin/users/${id}`, null, 'DELETE');
            if (!res.ok) throw new Error(res.message || 'Erro ao excluir usuário');
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.admin() });
        }
    });
}
