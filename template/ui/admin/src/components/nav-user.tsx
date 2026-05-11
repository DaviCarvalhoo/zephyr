import { useNavigate } from 'react-router-dom';
import { useUser } from '@/hooks/use-user';
import {
    UserCircle,
    Building2,
    LogOut,
    ChevronsUpDown
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    useSidebar
} from '@/components/ui/sidebar';

export function NavUser() {
    const { user, logout } = useUser();
    const { state } = useSidebar();
    const navigate = useNavigate();
    const isCollapsed = state === 'collapsed';

    if (!user) return null;

    const initials = user.name
        ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : user.email[0].toUpperCase();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            {user.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user.name}
                                    className="h-8 w-8 shrink-0 rounded-lg object-cover"
                                />
                            ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                                    {initials}
                                </div>
                            )}
                            {!isCollapsed && (
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{user.name}</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </span>
                                </div>
                            )}
                            {!isCollapsed && (
                                <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground" />
                            )}
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                        side="top"
                        align="start"
                        sideOffset={4}
                    >
                        <DropdownMenuItem onClick={() => navigate('/user/profile')}>
                            <UserCircle className="mr-2 h-4 w-4" />
                            Meu Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/user/select-account')}>
                            <Building2 className="mr-2 h-4 w-4" />
                            Minhas Contas
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={logout}
                            className="text-destructive focus:text-destructive"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
