import { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { UserProvider, useUser } from '@/hooks/use-user';
import { ThemeToggle } from '@/components/theme-toggle';
import {
    Building2,
    UserCircle,
    LogOut,
    Shield
} from 'lucide-react';

function UserLayoutInner() {
    const { user, loading, logout } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!user) return null;

    const navItems = [
        { label: 'Contas', href: '/user/select-account', icon: Building2 },
        { label: 'Perfil', href: '/user/profile', icon: UserCircle }
    ];

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-background sticky top-0 z-10">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                    <Link
                        to="/user/select-account"
                        className="text-lg font-semibold hover:opacity-80 transition-opacity"
                    >
                        {'{{PROJECT_NAME}}'}
                    </Link>

                    <nav className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                                        isActive
                                            ? 'bg-accent text-accent-foreground font-medium'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            );
                        })}

                        {user.role === 'admin' && (
                            <Link
                                to="/admin/dashboard"
                                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                            >
                                <Shield className="h-4 w-4" />
                                <span className="hidden sm:inline">Admin</span>
                            </Link>
                        )}

                        <div className="w-px h-6 bg-border mx-1" />

                        <ThemeToggle />

                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                            title="Sair"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Sair</span>
                        </button>
                    </nav>
                </div>
            </header>
            <main className="container mx-auto px-4 py-6">
                <Outlet />
            </main>
        </div>
    );
}

export default function UserLayout() {
    return (
        <UserProvider>
            <UserLayoutInner />
        </UserProvider>
    );
}
