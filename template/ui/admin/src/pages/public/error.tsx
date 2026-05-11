import { useRouteError, Link } from 'react-router-dom';

export default function ErrorPage() {
    const error = useRouteError() as any;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">
                    {error?.status || 404}
                </h1>
                <p className="text-muted-foreground">
                    {error?.statusText || 'Página não encontrada'}
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                    Voltar ao início
                </Link>
            </div>
        </div>
    );
}
