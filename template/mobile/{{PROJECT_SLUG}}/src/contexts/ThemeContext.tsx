import {
    createContext,
    useState,
    useContext,
    useEffect,
    ReactNode
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT, DARK, ThemePalette } from '../theme/colors';

const THEME_KEY = '@{{PROJECT_SLUG}}:theme';
const DEFAULT_THEME: 'light' | 'dark' | 'system' = '{{DEFAULT_THEME}}';

interface ThemeContextValue {
    isDark: boolean;
    toggle: () => void;
    colors: ThemePalette;
    ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [isDark, setIsDark] = useState<boolean>(DEFAULT_THEME !== 'light');
    const [ready, setReady] = useState<boolean>(false);

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY)
            .then(val => {
                if (val === 'light') {
                    setIsDark(false);
                } else if (val === 'dark') {
                    setIsDark(true);
                } else {
                    setIsDark(DEFAULT_THEME !== 'light');
                }
                setReady(true);
            })
            .catch(() => setReady(true));
    }, []);

    function toggle() {
        const next = !isDark;
        setIsDark(next);
        AsyncStorage
            .setItem(THEME_KEY, next ? 'dark' : 'light')
            .catch(() => { /* persistence is best-effort */ });
    }

    const colors = isDark ? DARK : LIGHT;

    return (
        <ThemeContext.Provider value={{ isDark, toggle, colors, ready }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return ctx;
}

export default ThemeContext;
