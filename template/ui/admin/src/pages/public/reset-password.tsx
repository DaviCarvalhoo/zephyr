import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import fetchApi from '@/lib/fetch-api';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [validToken, setValidToken] = useState<boolean | null>(null);

    useEffect(() => {
        async function validate() {
            try {
                const res = await fetchApi(`reset-password/${token}`);
                setValidToken(res.ok);
            } catch {
                setValidToken(false);
            }
        }
        if (token) validate();
    }, [token]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (password !== confirm) {
            toast.error('As senhas não coincidem');
            return;
        }

        setLoading(true);
        try {
            const res = await fetchApi(`reset-password/${token}`, { password }, 'POST');
            if (res.ok) {
                toast.success('Senha alterada com sucesso');
                navigate('/login');
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao redefinir senha');
        } finally {
            setLoading(false);
        }
    }

    if (validToken === null) {
        return (
            <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!validToken) {
        return (
            <div className="w-full max-w-sm mx-auto space-y-6 text-center">
                <h1 className="text-2xl font-bold">Link Inválido</h1>
                <p className="text-muted-foreground">
                    Este link expirou ou já foi utilizado.
                </p>
                <Link to="/forgot-password" className="text-primary hover:underline text-sm">
                    Solicitar novo link
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Nova Senha</h1>
                <p className="text-muted-foreground mt-2">Defina sua nova senha</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Nova senha"
                    required
                    minLength={6}
                />
                <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Confirme a senha"
                    required
                    minLength={6}
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center w-full h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
            </form>
        </div>
    );
}
