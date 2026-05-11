import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fetchApi from '@/lib/fetch-api';
import { toast } from 'sonner';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetchApi('login', { email, password }, 'POST');

            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(res.user));

                if (res.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    const lastAccountId = localStorage.getItem('lastAccountId');
                    if (lastAccountId) {
                        navigate(`/account/${lastAccountId}`);
                    } else {
                        navigate('/user/select-account');
                    }
                }
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Entrar</h1>
                <p className="text-muted-foreground mt-2">
                    Entre com sua conta para continuar
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="seu@email.com"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="password">
                        Senha
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Sua senha"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center w-full h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>

            <div className="text-center text-sm space-y-2">
                <Link to="/forgot-password" className="text-primary hover:underline">
                    Esqueceu sua senha?
                </Link>
                <p className="text-muted-foreground">
                    Não tem conta?{' '}
                    <Link to="/signup" className="text-primary hover:underline">
                        Criar conta
                    </Link>
                </p>
            </div>
        </div>
    );
}
