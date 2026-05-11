import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Outlet />
        </div>
    );
}
