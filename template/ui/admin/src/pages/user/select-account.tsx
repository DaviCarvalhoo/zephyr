import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/use-user';
import { useUserAccounts } from '@/hooks/queries/use-auth';
import { Building2, ChevronRight, Search, Inbox } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    owner: 'Proprietário',
    manager: 'Gerente',
    user: 'Usuário'
};

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    suspended: 'bg-red-500'
};

export default function SelectAccountPage() {
    const { user } = useUser();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const { data: accounts = [], isLoading } = useUserAccounts();

    const filtered = accounts.filter((a) => {
        if (!search) return true;
        return a.account.name.toLowerCase().includes(search.toLowerCase());
    });

    if (isLoading) {
        return (
            <div className="max-w-lg mx-auto space-y-4 pt-8">
                <div className="h-8 w-48 bg-muted rounded animate-pulse" />
                <div className="h-5 w-64 bg-muted rounded animate-pulse" />
                <div className="space-y-2 pt-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">
                    Olá, {user?.name}!
                </h1>
                <p className="text-muted-foreground mt-1">
                    {accounts.length > 0
                        ? 'Selecione uma conta para continuar'
                        : 'Você ainda não faz parte de nenhuma conta'}
                </p>
            </div>

            {accounts.length > 3 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar conta..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground"
                    />
                </div>
            )}

            {filtered.length > 0 ? (
                <div className="space-y-2">
                    {filtered.map(({ account, role }) => (
                        <button
                            key={account.id}
                            onClick={() => navigate(`/account/${account.id}`)}
                            className="w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-accent hover:border-accent transition-all text-left group"
                        >
                            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium truncate">{account.name}</p>
                                    <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_COLORS[account.status] || STATUS_COLORS.inactive}`} />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {ROLE_LABELS[role] || role}
                                </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                    ))}
                </div>
            ) : search ? (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">
                        Nenhuma conta encontrada para "{search}"
                    </p>
                </div>
            ) : (
                <div className="text-center py-12 space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Inbox className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                        Você ainda não faz parte de nenhuma conta.
                    </p>
                </div>
            )}
        </div>
    );
}
