import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccountContext } from '@/layouts/account';
import { useUpdateAccountSettings, useDeleteAccount } from '@/hooks/queries/use-accounts';
import { toast } from 'sonner';
import { Settings, AlertOctagon, Trash2 } from 'lucide-react';

export default function AccountSettingsPage() {
    const { accountId } = useParams<{ accountId: string }>();
    const navigate = useNavigate();
    const { account, accountRole, reload } = useAccountContext();
    const [name, setName] = useState(account?.name || '');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');

    const canDelete = accountRole === 'owner' || accountRole === 'admin';

    const updateMutation = useUpdateAccountSettings();
    const deleteMutation = useDeleteAccount();

    useEffect(() => {
        if (account) setName(account.name);
    }, [account]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        try {
            await updateMutation.mutateAsync({
                accountId: accountId!,
                data: { name }
            });
            toast.success('Configurações salvas');
            await reload();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao salvar');
        }
    }

    async function handleDeleteAccount() {
        if (deleteConfirm !== account?.name) return;

        try {
            await deleteMutation.mutateAsync(accountId!);
            toast.success('Conta excluída com sucesso');
            navigate('/user/select-account');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao excluir conta');
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold">Configurações</h1>
                <p className="text-muted-foreground mt-1">
                    Gerencie as configurações da conta
                </p>
            </div>

            {/* Informações Básicas */}
            <div className="rounded-lg border">
                <div className="p-4 border-b flex items-center gap-3">
                    <div className="p-2 rounded-md bg-gray-100 dark:bg-gray-800">
                        <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                        <h2 className="font-semibold">Informações Básicas</h2>
                        <p className="text-xs text-muted-foreground">
                            Dados gerais da conta
                        </p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nome da Conta</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Danger Zone */}
            {canDelete && (
                <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5">
                    <div className="p-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-destructive">
                            <AlertOctagon className="h-5 w-5" />
                            Zona de Perigo
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Ações irreversíveis que afetam sua conta permanentemente.
                        </p>
                    </div>

                    <div className="p-4 pt-0">
                        <div className="p-4 rounded-lg border border-destructive/20 bg-background">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="font-medium text-destructive">
                                        Excluir esta conta
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Ao excluir sua conta, todos os dados serão permanentemente
                                        removidos. Esta ação não pode ser desfeita.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm font-medium"
                                    onClick={() => setShowDeleteModal(true)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Excluir Conta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => {
                            setShowDeleteModal(false);
                            setDeleteConfirm('');
                        }}
                    />
                    <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-md mx-4">
                        <div className="p-6 pb-0">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <AlertOctagon className="h-6 w-6 text-destructive" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">Excluir Conta</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Esta ação é irreversível
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/10 p-3 mb-4">
                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                    Todos os dados associados a esta conta serão
                                    permanentemente excluídos, incluindo membros, configurações
                                    e arquivos.
                                </p>
                            </div>

                            <div className="space-y-2 mb-4">
                                <label className="text-sm font-medium">
                                    Digite <strong>{account?.name}</strong> para confirmar:
                                </label>
                                <input
                                    type="text"
                                    value={deleteConfirm}
                                    onChange={(e) => setDeleteConfirm(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    placeholder={account?.name}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 p-6 pt-2 border-t mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirm('');
                                }}
                                className="h-10 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirm !== account?.name || deleteMutation.isPending}
                                className="h-10 px-4 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                            >
                                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
