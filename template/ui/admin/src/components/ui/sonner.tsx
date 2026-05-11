import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/components/theme-provider';

export function Toaster() {
    const { theme } = useTheme();

    return (
        <Sonner
            theme={theme as 'light' | 'dark' | 'system'}
            position="top-center"
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
                    description: 'group-[.toast]:text-muted-foreground',
                    actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                    cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
                    success: 'group-[.toaster]:!bg-green-50 group-[.toaster]:!text-green-800 group-[.toaster]:!border-green-200 dark:group-[.toaster]:!bg-green-950 dark:group-[.toaster]:!text-green-300 dark:group-[.toaster]:!border-green-800',
                    error: 'group-[.toaster]:!bg-red-50 group-[.toaster]:!text-red-800 group-[.toaster]:!border-red-200 dark:group-[.toaster]:!bg-red-950 dark:group-[.toaster]:!text-red-300 dark:group-[.toaster]:!border-red-800',
                    warning: 'group-[.toaster]:!bg-amber-50 group-[.toaster]:!text-amber-800 group-[.toaster]:!border-amber-200 dark:group-[.toaster]:!bg-amber-950 dark:group-[.toaster]:!text-amber-300 dark:group-[.toaster]:!border-amber-800',
                    info: 'group-[.toaster]:!bg-blue-50 group-[.toaster]:!text-blue-800 group-[.toaster]:!border-blue-200 dark:group-[.toaster]:!bg-blue-950 dark:group-[.toaster]:!text-blue-300 dark:group-[.toaster]:!border-blue-800'
                }
            }}
        />
    );
}
