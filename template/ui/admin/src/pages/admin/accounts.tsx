import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import { useAccounts } from '@/hooks/queries/use-accounts';
import {
    Search,
    ExternalLink,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    suspended: 'Suspenso'
};

const PAGE_SIZE = 20;

export default function AdminAccountsPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading } = useAccounts({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined
    });

    const accounts = data?.rows || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 0;

    if (isLoading && accounts.length === 0) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 bg-muted rounded animate-pulse" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted rounded animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Contas</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {total} {total === 1 ? 'conta cadastrada' : 'contas cadastradas'}
                </p>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground"
                />
            </div>

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 text-sm font-medium">Nome</th>
                            <th className="text-left p-3 text-sm font-medium">Status</th>
                            <th className="text-left p-3 text-sm font-medium hidden sm:table-cell">Criado em</th>
                            <th className="text-right p-3 text-sm font-medium w-20">Acessar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.map((account) => (
                            <tr
                                key={account.id}
                                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                            >
                                <td className="p-3 text-sm font-medium">{account.name}</td>
                                <td className="p-3 text-sm">
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            STATUS_COLORS[account.status] || STATUS_COLORS.inactive
                                        }`}
                                    >
                                        {STATUS_LABELS[account.status] || account.status}
                                    </span>
                                </td>
                                <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">
                                    {formatDate(account.utc_created_on)}
                                </td>
                                <td className="p-3 text-sm text-right">
                                    <a
                                        href={`/account/${account.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex p-1.5 rounded-md hover:bg-accent transition-colors"
                                        title="Acessar conta"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </td>
                            </tr>
                        ))}
                        {accounts.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                    {debouncedSearch
                                        ? 'Nenhuma conta encontrada para essa busca.'
                                        : 'Nenhuma conta cadastrada.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {total} {total === 1 ? 'conta' : 'contas'}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm tabular-nums">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
