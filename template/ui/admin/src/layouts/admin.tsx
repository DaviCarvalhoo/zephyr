import { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { UserProvider, useUser } from '@/hooks/use-user';
import { ThemeToggle } from '@/components/theme-toggle';
import { NavUser } from '@/components/nav-user';
import {
    LayoutDashboard,
    Building2,
    Users,
    Menu,
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

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        title: 'Principal',
        items: [
            { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }
        ]
    },
    {
        title: 'Cadastros',
        items: [
            { label: 'Usuários', href: '/admin/users', icon: Users },
            { label: 'Contas', href: '/admin/accounts', icon: Building2 }
        ]
    }
];

function AdminSidebar() {
    const location = useLocation();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to="/admin/dashboard">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                                    {'{{PROJECT_SLUG}}'.charAt(0).toUpperCase()}
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{'{{PROJECT_NAME}}'}</span>
                                    <span className="truncate text-xs text-muted-foreground">Administração</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {NAV_SECTIONS.map((section) => (
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
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}

function AdminHeader() {
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

function AdminLayoutInner() {
    const { user, loading } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <SidebarProvider>
            <AdminSidebar />
            <SidebarInset>
                <AdminHeader />
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}

export default function AdminLayout() {
    return (
        <UserProvider>
            <AdminLayoutInner />
        </UserProvider>
    );
}
