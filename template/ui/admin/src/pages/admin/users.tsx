import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useConfirm } from '@/hooks/use-confirm';
import {
    useUsers,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    type User
} from '@/hooks/queries/use-users';
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

interface UserFormData {
    name: string;
    email: string;
    role: string;
    password: string;
}

const EMPTY_FORM: UserFormData = { name: '', email: '', role: 'user', password: '' };

const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    user: 'Usuário'
};

const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    user: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
};

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [showDialog, setShowDialog] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form, setForm] = useState<UserFormData>(EMPTY_FORM);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading } = useUsers({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined
    });

    const confirm = useConfirm();
    const createMutation = useCreateUser();
    const updateMutation = useUpdateUser();
    const deleteMutation = useDeleteUser();

    const users = data?.rows || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 0;

    function openCreate() {
        setEditingUser(null);
        setForm(EMPTY_FORM);
        setShowDialog(true);
    }

    function openEdit(user: User) {
        setEditingUser(user);
        setForm({
            name: user.name,
            email: user.email,
            role: user.role,
            password: ''
        });
        setShowDialog(true);
    }

    function closeDialog() {
        setShowDialog(false);
        setEditingUser(null);
        setForm(EMPTY_FORM);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();

        try {
            if (editingUser) {
                const body: Record<string, string> = {
                    name: form.name,
                    email: form.email,
                    role: form.role
                };
                if (form.password) body.password = form.password;

                await updateMutation.mutateAsync({ id: editingUser.id, data: body });
                toast.success('Usuário atualizado');
                closeDialog();
            } else {
                if (!form.password) {
                    toast.error('Senha é obrigatória para novos usuários');
                    return;
                }

                await createMutation.mutateAsync(form);
                toast.success('Usuário criado');
                closeDialog();
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao salvar usuário');
        }
    }

    async function handleDelete(user: User) {
        const ok = await confirm({
            title: 'Excluir Usuário',
            description: `Tem certeza que deseja excluir "${user.name}"?`,
            confirmLabel: 'Excluir',
            variant: 'destructive'
        });
        if (!ok) return;

        try {
            await deleteMutation.mutateAsync(user.id);
            toast.success('Usuário excluído');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao excluir usuário');
        }
    }

    const saving = createMutation.isPending || updateMutation.isPending;

    if (isLoading && users.length === 0) {
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
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Usuários</h1>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Novo Usuário
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
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
                            <th className="text-left p-3 text-sm font-medium hidden sm:table-cell">Email</th>
                            <th className="text-left p-3 text-sm font-medium">Tipo</th>
                            <th className="text-left p-3 text-sm font-medium hidden md:table-cell">Contas</th>
                            <th className="text-left p-3 text-sm font-medium hidden lg:table-cell">Criado em</th>
                            <th className="text-right p-3 text-sm font-medium w-24">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr
                                key={user.id}
                                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                            >
                                <td className="p-3 text-sm">
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-muted-foreground sm:hidden text-xs">
                                            {user.email}
                                        </p>
                                    </div>
                                </td>
                                <td className="p-3 text-sm hidden sm:table-cell text-muted-foreground">
                                    {user.email}
                                </td>
                                <td className="p-3 text-sm">
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            ROLE_COLORS[user.role] || ROLE_COLORS.user
                                        }`}
                                    >
                                        {ROLE_LABELS[user.role] || user.role}
                                    </span>
                                </td>
                                <td className="p-3 text-sm hidden md:table-cell">
                                    {user.accounts.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {user.accounts.slice(0, 3).map((a) => (
                                                <span
                                                    key={a.id}
                                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-muted"
                                                    title={`${a.name} (${a.role})`}
                                                >
                                                    {a.name}
                                                </span>
                                            ))}
                                            {user.accounts.length > 3 && (
                                                <span className="text-xs text-muted-foreground">
                                                    +{user.accounts.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">
                                            Nenhuma
                                        </span>
                                    )}
                                </td>
                                <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">
                                    {formatDate(user.utc_created_on)}
                                </td>
                                <td className="p-3 text-sm text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => openEdit(user)}
                                            className="p-1.5 rounded-md hover:bg-accent transition-colors"
                                            title="Editar"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user)}
                                            disabled={deleteMutation.isPending}
                                            className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                                            title="Excluir"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                    {debouncedSearch
                                        ? 'Nenhum usuário encontrado para essa busca.'
                                        : 'Nenhum usuário cadastrado.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {total} {total === 1 ? 'usuário' : 'usuários'}
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

            {/* Create/Edit Dialog */}
            {showDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={closeDialog}
                    />
                    <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
                        <h2 className="text-lg font-semibold mb-4">
                            {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, name: e.target.value }))
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, email: e.target.value }))
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo</label>
                                <select
                                    value={form.role}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, role: e.target.value }))
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="user">Usuário</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {editingUser
                                        ? 'Nova Senha (deixe em branco para manter)'
                                        : 'Senha'}
                                </label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, password: e.target.value }))
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    minLength={6}
                                    required={!editingUser}
                                    placeholder={editingUser ? 'Manter senha atual' : ''}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeDialog}
                                    className="h-10 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
