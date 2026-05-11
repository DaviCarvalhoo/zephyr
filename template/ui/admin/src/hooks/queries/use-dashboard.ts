import { useQuery } from '@tanstack/react-query';
import fetchApi from '@/lib/fetch-api';
import { queryKeys } from '@/lib/query-keys';

export interface ChartDataPoint {
    date: string;
    count: number;
}

export interface AdminDashboardData {
    stats: {
        users: number;
        accounts: number;
    };
    recentUsers: {
        id: string;
        name: string;
        email: string;
        role: string;
        utc_created_on: string;
    }[];
    recentAccounts: {
        id: string;
        name: string;
        status: string;
        utc_created_on: string;
    }[];
    usersByDay: ChartDataPoint[];
}

export interface AccountDashboardData {
    accountId: string;
    stats: {
        members: number;
    };
    membersByDay: ChartDataPoint[];
}

export function useAdminDashboard() {
    return useQuery({
        queryKey: queryKeys.dashboard.admin(),
        queryFn: async (): Promise<AdminDashboardData> => {
            const res = await fetchApi('admin/dashboard');
            if (!res.ok) throw new Error(res.message || 'Erro ao carregar dashboard');
            return {
                stats: res.stats,
                recentUsers: res.recentUsers || [],
                recentAccounts: res.recentAccounts || [],
                usersByDay: res.usersByDay || []
            };
        },
        staleTime: 1000 * 60 * 2
    });
}

export function useAccountDashboard(accountId: string) {
    return useQuery({
        queryKey: queryKeys.dashboard.account(accountId),
        queryFn: async (): Promise<AccountDashboardData> => {
            const res = await fetchApi(`account/${accountId}/dashboard`);
            if (!res.ok) throw new Error(res.message || 'Erro ao carregar dashboard');
            return {
                accountId: res.accountId,
                stats: res.stats,
                membersByDay: res.membersByDay || []
            };
        },
        staleTime: 1000 * 60 * 2
    });
}
