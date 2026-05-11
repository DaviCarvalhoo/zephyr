import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import fetchApi from '@/lib/fetch-api';
import { queryKeys, type PaginationFilters } from '@/lib/query-keys';

export interface Account {
    id: string;
    name: string;
    status: string;
    utc_created_on: string;
}

export interface AccountsResponse {
    ok: boolean;
    rows: Account[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function useAccounts(filters: PaginationFilters) {
    return useQuery({
        queryKey: queryKeys.accounts.list(filters),
        placeholderData: keepPreviousData,
        queryFn: async (): Promise<AccountsResponse> => {
            const params: Record<string, string> = {};
            if (filters.page) params.page = String(filters.page);
            if (filters.limit) params.limit = String(filters.limit);
            if (filters.search) params.search = filters.search;

            const res = await fetchApi('admin/accounts', params);
            if (!res.ok) throw new Error(res.message || 'Erro ao carregar contas');
            return res;
        }
    });
}

export function useUpdateAccountSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ accountId, data }: { accountId: string; data: { name: string } }) => {
            const res = await fetchApi(`account/${accountId}/settings`, data, 'POST');
            if (!res.ok) throw new Error(res.message || 'Erro ao salvar configurações');
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
        }
    });
}

export function useDeleteAccount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (accountId: string) => {
            const res = await fetchApi(`account/${accountId}/delete`, null, 'DELETE');
            if (!res.ok) throw new Error(res.message || 'Erro ao excluir conta');
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.auth.userAccounts() });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.admin() });
        }
    });
}
