import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { router } from './router';

export default function App() {
    return (
        <ThemeProvider defaultTheme="{{DEFAULT_THEME}}" storageKey="ui-theme">
            <RouterProvider router={router} />
            <Toaster />
        </ThemeProvider>
    );
}
