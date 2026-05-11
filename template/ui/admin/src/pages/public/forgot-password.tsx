import { useState } from 'react';
import { Link } from 'react-router-dom';
import fetchApi from '@/lib/fetch-api';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            await fetchApi('forgot-password', { email }, 'POST');
            setSent(true);
            toast.success('Verifique seu email');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao enviar email');
        } finally {
            setLoading(false);
        }
    }

    if (sent) {
        return (
            <div className="w-full max-w-sm mx-auto space-y-6 text-center">
                <h1 className="text-2xl font-bold">Email Enviado</h1>
                <p className="text-muted-foreground">
                    Se o email existir, você receberá um link de recuperação.
                </p>
                <Link to="/login" className="text-primary hover:underline text-sm">
                    Voltar para login
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Esqueceu sua senha?</h1>
                <p className="text-muted-foreground mt-2">
                    Informe seu email para receber um link de recuperação
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="seu@email.com"
                    required
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center w-full h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                    {loading ? 'Enviando...' : 'Enviar Link'}
                </button>
            </form>

            <p className="text-center text-sm">
                <Link to="/login" className="text-primary hover:underline">
                    Voltar para login
                </Link>
            </p>
        </div>
    );
}
