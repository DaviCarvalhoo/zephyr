import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from 'react';
import { Outlet, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { UserProvider, useUser } from '@/hooks/use-user';
import { ThemeToggle } from '@/components/theme-toggle';
import { NavUser } from '@/components/nav-user';
import fetchApi from '@/lib/fetch-api';
import {
    LayoutDashboard,
    Settings,
    Users,
    Home,
    Menu,
    Shield,
    type LucideIcon
} from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
    useSidebar
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

interface Account {
    id: string;
    name: string;
    status: string;
}

interface AccountContextType {
    account: Account | null;
    accountRole: string | null;
    loading: boolean;
    reload: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | null>(null);

export function useAccountContext(): AccountContextType {
    const context = useContext(AccountContext);
    if (!context) {
        throw new Error('useAccountContext must be used within AccountLayout');
    }
    return context;
}

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

function getNavSections(basePath: string): NavSection[] {
    return [
        {
            title: 'Principal',
            items: [
                { label: 'Dashboard', href: `${basePath}/dashboard`, icon: LayoutDashboard },
                { label: 'Usuários', href: `${basePath}/members`, icon: Users }
            ]
        },
        {
            title: 'Configurações',
            items: [
                { label: 'Configurações', href: `${basePath}/settings`, icon: Settings }
            ]
        }
    ];
}

function AccountSidebar({ account, accountRole, basePath }: {
    account: Account;
    accountRole: string | null;
    basePath: string;
}) {
    const { user } = useUser();
    const location = useLocation();
    const navSections = getNavSections(basePath);

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to="/user/select-account">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                                    <Home className="h-4 w-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{account.name}</span>
                                    <span className="truncate text-xs text-muted-foreground capitalize">
                                        {accountRole}
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {navSections.map((section) => (
                    <SidebarGroup key={section.title}>
                        <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {section.items.map((item) => {
                                    const isActive = location.pathname === item.href
                                        || location.pathname.startsWith(item.href + '/');
                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive}
                                                tooltip={item.label}
                                            >
                                                <Link to={item.href}>
                                                    <item.icon />
                                                    <span>{item.label}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
                {user?.role === 'admin' && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Sistema</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild tooltip="Administração">
                                        <Link to="/admin/dashboard">
                                            <Shield />
                                            <span>Administração</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}

function AccountHeader() {
    const { user } = useUser();
    const { toggleSidebar, isMobile } = useSidebar();

    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <div className="flex items-center gap-2">
                {isMobile ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleSidebar}>
                        <Menu className="h-4 w-4" />
                    </Button>
                ) : (
                    <SidebarTrigger className="-ml-1" />
                )}
                <Separator orientation="vertical" className="mr-2 h-4" />
                <span className="text-sm text-muted-foreground">
                    {user?.name}
                </span>
            </div>
            <div className="ml-auto">
                <ThemeToggle />
            </div>
        </header>
    );
}

function AccountLayoutInner() {
    const { user, loading: userLoading } = useUser();
    const { accountId } = useParams<{ accountId: string }>();
    const navigate = useNavigate();
    const [account, setAccount] = useState<Account | null>(null);
    const [accountRole, setAccountRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    async function loadAccount() {
        if (!accountId) return;

        try {
            setLoading(true);
            const res = await fetchApi(`auth`, { account: accountId });
            if (res.ok) {
                setAccount(res.account);
                setAccountRole(res.role);
                localStorage.setItem('lastAccountId', accountId);
            }
        } catch {
            navigate('/user/select-account');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!userLoading && !user) {
            navigate('/login');
            return;
        }

        if (user && accountId) {
            loadAccount();
        }
    }, [user, userLoading, accountId]);

    if (userLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!user || !account) return null;

    const basePath = `/account/${accountId}`;

    return (
        <AccountContext.Provider value={{ account, accountRole, loading, reload: loadAccount }}>
            <SidebarProvider>
                <AccountSidebar
                    account={account}
                    accountRole={accountRole}
                    basePath={basePath}
                />
                <SidebarInset>
                    <AccountHeader />
                    <main className="flex-1 p-6">
                        <Outlet />
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </AccountContext.Provider>
    );
}

export default function AccountLayout() {
    return (
        <UserProvider>
            <AccountLayoutInner />
        </UserProvider>
    );
}
