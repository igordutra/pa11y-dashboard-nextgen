import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Activity, LayoutDashboard, Settings, Plus } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CategoriesManager, CategoryIcon } from './CategoriesManager';

interface LayoutProps {
    children: React.ReactNode;
}

interface Category {
    _id: string;
    name: string;
    description?: string;
    icon: string;
    color: string;
}

export function Layout({ children }: LayoutProps) {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const isSettings = location.pathname === '/settings';
    const isDashboard = location.pathname === '/' || location.pathname === '';
    const activeCategory = searchParams.get('category');

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => (await api.get('/api/categories')).data,
    });

    return (
        <div className="min-h-screen bg-background font-sans antialiased text-foreground">
            <div className="grid lg:grid-cols-5 xl:grid-cols-6 min-h-screen">
                {/* Sidebar */}
                <div className="hidden lg:flex lg:flex-col lg:col-span-1 border-r bg-muted/40 p-4">
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl mb-8 px-2 hover:opacity-80 transition-opacity">
                        <Activity className="h-6 w-6 text-primary" aria-hidden="true" />
                        <span>Pa11y Dash</span>
                    </Link>
                    <nav className="flex flex-col gap-1 flex-1">
                        <Link to="/"
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isDashboard && !activeCategory ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground/80'
                                }`}>
                            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                            All URLs
                        </Link>

                        {categories.length > 0 && (
                            <div className="mt-3 mb-1">
                                <div className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                                    Categories
                                </div>
                                {categories.map((cat) => (
                                    <Link
                                        key={cat._id}
                                        to={`/?category=${cat._id}`}
                                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeCategory === cat._id
                                            ? 'bg-accent text-accent-foreground'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground/80'
                                            }`}
                                    >
                                        <div style={{ color: cat.color }}>
                                            <CategoryIcon icon={cat.icon} />
                                        </div>
                                        <span className="truncate">{cat.name}</span>
                                    </Link>
                                ))}
                            </div>
                        )}

                        <CategoriesManager
                            trigger={
                                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors w-full text-left">
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    {categories.length === 0 ? 'Add Category' : 'Manage'}
                                </button>
                            }
                        />

                        <div className="flex-1" />

                        <Link to="/settings"
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isSettings ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground/80'
                                }`}>
                            <Settings className="h-4 w-4" aria-hidden="true" />
                            Settings
                        </Link>
                    </nav>
                </div>

                {/* Main Content */}
                <div className="col-span-1 lg:col-span-4 xl:col-span-5 flex flex-col">
                    <header className="h-14 border-b flex items-center px-6 lg:hidden">
                        <div className="flex items-center gap-2 font-bold text-xl">
                            <Activity className="h-6 w-6 text-primary" aria-hidden="true" />
                            <span>Pa11y Dash</span>
                        </div>
                    </header>
                    <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
