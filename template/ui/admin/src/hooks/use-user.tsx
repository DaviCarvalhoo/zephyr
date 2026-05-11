import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode
} from 'react';
import fetchApi from '@/lib/fetch-api';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar_url: string | null;
}

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    loading: boolean;
    loadUser: () => Promise<void>;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    async function loadUser() {
        try {
            setLoading(true);
            const res = await fetchApi('auth');
            if (res.ok && res.user) {
                setUser(res.user);
                localStorage.setItem('user', JSON.stringify(res.user));
            }
        } catch {
            setUser(null);
            localStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    }

    async function logout() {
        try {
            await fetchApi('logout', null, 'POST');
        } catch {
            // ignore
        }
        setUser(null);
        sessionStorage.clear();
        localStorage.removeItem('user');
        localStorage.removeItem('lastAccountId');
        window.location.href = '/login';
    }

    useEffect(() => {
        const cached = localStorage.getItem('user');
        if (cached) {
            try {
                setUser(JSON.parse(cached));
            } catch {
                // ignore
            }
        }
        loadUser();
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, loading, loadUser, logout }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser(): UserContextType {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
