export interface PaginationFilters {
    page?: number;
    limit?: number;
    search?: string;
}

export const queryKeys = {
    // Users (admin)
    users: {
        all: ['users'] as const,
        lists: () => [...queryKeys.users.all, 'list'] as const,
        list: (filters: PaginationFilters) => [...queryKeys.users.lists(), filters] as const,
        details: () => [...queryKeys.users.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.users.details(), id] as const
    },

    // Accounts (admin)
    accounts: {
        all: ['accounts'] as const,
        lists: () => [...queryKeys.accounts.all, 'list'] as const,
        list: (filters: PaginationFilters) => [...queryKeys.accounts.lists(), filters] as const,
        details: () => [...queryKeys.accounts.all, 'detail'] as const,
        detail: (id: string) => [...queryKeys.accounts.details(), id] as const
    },

    // Dashboard
    dashboard: {
        all: ['dashboard'] as const,
        admin: () => [...queryKeys.dashboard.all, 'admin'] as const,
        account: (accountId: string) => [...queryKeys.dashboard.all, 'account', accountId] as const
    },

    // Account members
    members: {
        all: ['members'] as const,
        list: (accountId: string, filters?: PaginationFilters) => [...queryKeys.members.all, accountId, filters] as const
    },

    // Auth / user-scoped
    auth: {
        all: ['auth'] as const,
        userAccounts: () => [...queryKeys.auth.all, 'user-accounts'] as const
    }
};
