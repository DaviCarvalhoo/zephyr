import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import fetchApi from '@/lib/fetch-api';
import { queryKeys, type PaginationFilters } from '@/lib/query-keys';

export interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    utc_created_on: string;
}

export interface MembersResponse {
    ok: boolean;
    rows: Member[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function useMembers(accountId: string, filters: PaginationFilters = {}) {
    return useQuery({
        queryKey: queryKeys.members.list(accountId, filters),
        placeholderData: keepPreviousData,
        queryFn: async (): Promise<MembersResponse> => {
            const params: Record<string, string> = {};
            if (filters.page) params.page = String(filters.page);
            if (filters.limit) params.limit = String(filters.limit);
            if (filters.search) params.search = filters.search;

            const res = await fetchApi(`account/${accountId}/members`, params);
            if (!res.ok) throw new Error(res.message || 'Erro ao carregar usuários');
            return res;
        },
        enabled: !!accountId
    });
}

export interface AddMemberData {
    email: string;
    role: string;
    name?: string;
    password?: string;
}

export function useAddMember(accountId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AddMemberData) => {
            const res = await fetchApi(`account/${accountId}/members`, data, 'POST');
            if (!res.ok) throw new Error(res.message || 'Erro ao adicionar usuário');
            return res.member;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
        }
    });
}

export function useUpdateMemberRole(accountId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
            const res = await fetchApi(`account/${accountId}/members/${userId}`, { role }, 'POST');
            if (!res.ok) throw new Error(res.message || 'Erro ao atualizar função');
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
        }
    });
}

export function useRemoveMember(accountId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            const res = await fetchApi(`account/${accountId}/members/${userId}`, null, 'DELETE');
            if (!res.ok) throw new Error(res.message || 'Erro ao remover usuário');
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
        }
    });
}
