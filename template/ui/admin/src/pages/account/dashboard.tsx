import { useParams } from 'react-router-dom';
import { useAccountContext } from '@/layouts/account';
import { useAccountDashboard, type ChartDataPoint } from '@/hooks/queries/use-dashboard';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip';
import { Building2, Shield, Users } from 'lucide-react';

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
                                                {point.count === 1 ? 'novo membro' : 'novos membros'}
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

export default function AccountDashboardPage() {
    const { accountId } = useParams<{ accountId: string }>();
    const { account, accountRole } = useAccountContext();
    const { data } = useAccountDashboard(accountId!);

    const membersByDay = data?.membersByDay || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Bem-vindo ao painel de {account?.name}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Conta</p>
                        <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <p className="text-lg font-semibold mt-2">{account?.name}</p>
                </div>
                <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Seu Papel</p>
                        <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900/30">
                            <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <p className="text-lg font-semibold mt-2 capitalize">{accountRole}</p>
                </div>
                <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Membros</p>
                        <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                            <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold mt-2">{data?.stats?.members ?? '...'}</p>
                </div>
            </div>

            <BarChart data={membersByDay} label="Novos Membros" />
        </div>
    );
}
