import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import { useAdminDashboard, type ChartDataPoint } from '@/hooks/queries/use-dashboard';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip';
import {
    Users,
    Building2,
    TrendingUp,
    ArrowRight
} from 'lucide-react';

function BarChart({ data, label }: { data: ChartDataPoint[]; label: string }) {
    if (!data.length) return null;

    const maxCount = Math.max(...data.map((d) => d.count), 1);

    return (
        <div className="rounded-lg border">
            <div className="p-4 border-b">
                <h2 className="font-semibold">{label}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Últimos 14 dias</p>
            </div>
            <div className="p-4">
                <TooltipProvider delayDuration={0}>
                    <div className="flex items-end gap-1 h-32">
                        {data.map((point) => {
                            const height = Math.max((point.count / maxCount) * 100, 4);
                            const dateStr = new Date(point.date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit'
                            });

                            return (
                                <Tooltip key={point.date}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className="flex-1 rounded-sm bg-primary cursor-pointer transition-opacity hover:opacity-80"
                                            style={{ height: `${height}%` }}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="text-center">
                                            <p className="text-xs font-medium">{dateStr}</p>
                                            <p className="text-lg font-bold text-primary">
                                                {point.count}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {point.count === 1 ? 'novo registro' : 'novos registros'}
                                            </p>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                    <div className="flex gap-1 mt-2">
                        {data.map((point, i) => {
                            if (i % 3 !== 0 && i !== data.length - 1) {
                                return <div key={point.date} className="flex-1" />;
                            }
                            return (
                                <div key={point.date} className="flex-1 text-center">
                                    <p className="text-[10px] text-muted-foreground">
                                        {new Date(point.date).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit'
                                        })}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </TooltipProvider>
            </div>
        </div>
    );
}

export default function AdminDashboardPage() {
    const navigate = useNavigate();
    const { data } = useAdminDashboard();

    const stats = data?.stats;
    const recentUsers = data?.recentUsers || [];
    const recentAccounts = data?.recentAccounts || [];
    const usersByDay = data?.usersByDay || [];

    const statCards = [
        {
            label: 'Total de Usuários',
            value: stats?.users,
            icon: Users,
            color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
            href: '/admin/users'
        },
        {
            label: 'Total de Contas',
            value: stats?.accounts,
            icon: Building2,
            color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
            href: '/admin/accounts'
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Visão geral da plataforma
                </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <button
                            key={card.label}
                            onClick={() => navigate(card.href)}
                            className="rounded-lg border p-4 text-left hover:bg-muted/30 transition-colors group"
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    {card.label}
                                </p>
                                <div className={`p-2 rounded-md ${card.color}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2 mt-2">
                                <p className="text-3xl font-bold">
                                    {card.value ?? '...'}
                                </p>
                                <TrendingUp className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Chart */}
            <BarChart data={usersByDay} label="Novos Usuários" />

            {/* Recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent users */}
                <div className="rounded-lg border">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h2 className="font-semibold">Usuários Recentes</h2>
                        <button
                            onClick={() => navigate('/admin/users')}
                            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                            Ver todos
                            <ArrowRight className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="divide-y">
                        {recentUsers.map((user) => (
                            <div key={user.id} className="p-3 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {user.email}
                                    </p>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {formatDate(user.utc_created_on)}
                                </span>
                            </div>
                        ))}
                        {recentUsers.length === 0 && (
                            <p className="p-4 text-sm text-muted-foreground text-center">
                                Nenhum usuário ainda
                            </p>
                        )}
                    </div>
                </div>

                {/* Recent accounts */}
                <div className="rounded-lg border">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h2 className="font-semibold">Contas Recentes</h2>
                        <button
                            onClick={() => navigate('/admin/accounts')}
                            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                            Ver todas
                            <ArrowRight className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="divide-y">
                        {recentAccounts.map((account) => (
                            <a
                                key={account.id}
                                href={`/account/${account.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                            >
                                <div className="h-8 w-8 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                    <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {account.name}
                                    </p>
                                    <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                            account.status === 'active'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                        }`}
                                    >
                                        {account.status}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {formatDate(account.utc_created_on)}
                                </span>
                            </a>
                        ))}
                        {recentAccounts.length === 0 && (
                            <p className="p-4 text-sm text-muted-foreground text-center">
                                Nenhuma conta ainda
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
