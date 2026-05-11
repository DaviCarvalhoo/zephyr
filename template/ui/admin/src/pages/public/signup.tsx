import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fetchApi from '@/lib/fetch-api';
import { toast } from 'sonner';

export default function SignupPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accountName, setAccountName] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetchApi('signup', {
                name,
                email,
                password,
                account_name: accountName || name
            }, 'POST');

            if (res.ok && res.existingUser) {
                toast.info(res.message);
                navigate('/login');
                return;
            }

            if (res.ok) {
                localStorage.setItem('user', JSON.stringify(res.user));
                navigate(`/account/${res.account.id}`);
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Criar Conta</h1>
                <p className="text-muted-foreground mt-2">
                    Crie sua conta para começar
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Nome</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Seu nome"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="seu@email.com"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Senha</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Nome da Organização</label>
                    <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Nome da sua empresa (opcional)"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center w-full h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                    {loading ? 'Criando...' : 'Criar Conta'}
                </button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{' '}
                <Link to="/login" className="text-primary hover:underline">
                    Entrar
                </Link>
            </p>
        </div>
    );
}
