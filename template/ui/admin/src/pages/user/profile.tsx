import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/use-user';
import {
    useUserAccounts,
    useUpdateProfile,
    useChangePassword,
    useUploadAvatar,
    useDeleteAvatar
} from '@/hooks/queries/use-auth';
import { toast } from 'sonner';
import {
    UserCircle,
    Lock,
    Building2,
    ChevronRight,
    Camera,
    Trash2,
    Loader2
} from 'lucide-react';

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

export default function ProfilePage() {
    const { user, loadUser } = useUser();
    const navigate = useNavigate();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: accounts = [], isLoading: accountsLoading } = useUserAccounts();
    const updateProfileMutation = useUpdateProfile();
    const changePasswordMutation = useChangePassword();
    const uploadAvatarMutation = useUploadAvatar();
    const deleteAvatarMutation = useDeleteAvatar();

    async function handleUpdateProfile(e: React.FormEvent) {
        e.preventDefault();

        try {
            await updateProfileMutation.mutateAsync({ name, email });
            toast.success('Perfil atualizado');
            await loadUser();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar perfil');
        }
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();

        try {
            await changePasswordMutation.mutateAsync({
                current_password: currentPassword,
                new_password: newPassword
            });
            toast.success('Senha alterada com sucesso');
            setCurrentPassword('');
            setNewPassword('');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao alterar senha');
        }
    }

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('A imagem deve ter no máximo 2MB');
            return;
        }

        try {
            await uploadAvatarMutation.mutateAsync(file);
            toast.success('Foto atualizada');
            await loadUser();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao enviar foto');
        }

        // Reset input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleDeleteAvatar() {
        try {
            await deleteAvatarMutation.mutateAsync();
            toast.success('Foto removida');
            await loadUser();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao remover foto');
        }
    }

    const isUploadingAvatar = uploadAvatarMutation.isPending || deleteAvatarMutation.isPending;

    return (
        <div className="max-w-lg space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Meu Perfil</h1>
                <p className="text-muted-foreground mt-1">
                    Atualize suas informações pessoais
                </p>
            </div>

            {/* Avatar */}
            <div className="rounded-lg border">
                <div className="p-4 border-b flex items-center gap-3">
                    <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                        <Camera className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="font-semibold">Foto de Perfil</h2>
                </div>
                <div className="p-4 flex items-center gap-4">
                    <div className="relative group">
                        {user?.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.name}
                                className="h-20 w-20 rounded-full object-cover border-2 border-muted"
                            />
                        ) : (
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-muted">
                                <span className="text-2xl font-bold text-primary">
                                    {user?.name?.charAt(0)?.toUpperCase()}
                                </span>
                            </div>
                        )}
                        {isUploadingAvatar && (
                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingAvatar}
                                className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                                {user?.avatar_url ? 'Trocar foto' : 'Enviar foto'}
                            </button>
                            {user?.avatar_url && (
                                <button
                                    type="button"
                                    onClick={handleDeleteAvatar}
                                    disabled={isUploadingAvatar}
                                    className="h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remover
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            JPG, PNG ou WebP. Máximo 2MB.
                        </p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                </div>
            </div>

            <div className="rounded-lg border">
                <div className="p-4 border-b flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                        <UserCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="font-semibold">Dados Pessoais</h2>
                </div>
                <form onSubmit={handleUpdateProfile} className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            className="h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="rounded-lg border">
                <div className="p-4 border-b flex items-center gap-3">
                    <div className="p-2 rounded-md bg-violet-100 dark:bg-violet-900/30">
                        <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h2 className="font-semibold">Minhas Contas</h2>
                        <p className="text-xs text-muted-foreground">
                            Contas que você tem acesso
                        </p>
                    </div>
                </div>
                <div className="divide-y">
                    {accountsLoading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                            ))}
                        </div>
                    ) : accounts.length > 0 ? (
                        accounts.map(({ account, role }) => (
                            <button
                                key={account.id}
                                onClick={() => navigate(`/account/${account.id}`)}
                                className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left group"
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_COLORS[account.status] || STATUS_COLORS.inactive}`} />
                                    <span className="text-sm font-medium truncate">{account.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {ROLE_LABELS[role] || role}
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-center">
                            <p className="text-sm text-muted-foreground">
                                Você não faz parte de nenhuma conta.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-lg border">
                <div className="p-4 border-b flex items-center gap-3">
                    <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
                        <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h2 className="font-semibold">Alterar Senha</h2>
                </div>
                <form onSubmit={handleChangePassword} className="p-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Senha Atual</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nova Senha</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            required
                            minLength={6}
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={changePasswordMutation.isPending}
                            className="h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {changePasswordMutation.isPending ? 'Alterando...' : 'Alterar Senha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
