import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { 
    Activity, 
    LayoutDashboard, 
    Settings, 
    Plus, 
    Menu, 
    X,
    ChevronRight,
    MonitorPlay,
    BarChart3,
    LogOut
} from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CategoriesManager, CategoryIcon } from './CategoriesManager';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from './ui/dialog';
import { useAuth } from '../lib/AuthContext';

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

interface Environment {
    pa11yVersion: string;
    nodeVersion: string;
    availableRunners: string[];
    availableStandards: string[];
    readonly: boolean;
    demoMode: boolean;
    authEnabled: boolean;
}

export function Layout({ children }: LayoutProps) {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { logout, user } = useAuth();
    
    const isSettings = location.pathname === '/settings';
    const isDashboard = location.pathname === '/' || location.pathname === '';
    const isJobs = location.pathname === '/jobs';
    const isAnalytics = location.pathname === '/analytics';
    const activeCategory = searchParams.get('category');

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => (await api.get('/api/categories')).data,
    });

    const { data: env } = useQuery<Environment>({
        queryKey: ['environment'],
        queryFn: async () => (await api.get('/api/environment')).data,
    });

    // Close mobile menu on route change
    useEffect(() => {
        // Defer to next tick to avoid "setState in effect" warning
        setTimeout(() => setIsMobileMenuOpen(false), 0);
    }, [location.pathname, searchParams]);

    const navContent = (
        <nav className="flex flex-col gap-2 h-full">
            <Link to="/"
                className={`
                    flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all
                    ${isDashboard && !activeCategory 
                        ? 'bg-slate-800 text-white shadow-lg shadow-slate-200' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}
                `}
            >
                <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-4 w-4" />
                    All URLs
                </div>
                {isDashboard && !activeCategory && <ChevronRight className="h-3 w-3 opacity-50" />}
            </Link>

            <Link to="/analytics"
                className={`
                    flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all
                    ${isAnalytics
                        ? 'bg-slate-800 text-white shadow-lg shadow-slate-200'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}
                `}
            >
                <div className="flex items-center gap-3">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                </div>
                {isAnalytics && <ChevronRight className="h-3 w-3 opacity-50" />}
            </Link>

            <Link to="/jobs"
                className={`
                    flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all
                    ${isJobs
                        ? 'bg-slate-800 text-white shadow-lg shadow-slate-200'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}
                `}
            >
                <div className="flex items-center gap-3">
                    <MonitorPlay className="h-4 w-4" />
                    Job Monitoring
                </div>
                {isJobs && <ChevronRight className="h-3 w-3 opacity-50" />}
            </Link>

            {categories.length > 0 && (
                <div className="mt-6 mb-2">
                    <div className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                        Categories
                    </div>
                    <div className="space-y-1">
                        {categories.map((cat) => (
                            <Link
                                key={cat._id}
                                to={`/?category=${cat._id}`}
                                className={`
                                    flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all
                                    ${activeCategory === cat._id
                                        ? 'bg-slate-800 text-white shadow-lg shadow-slate-200'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1 rounded-lg" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                                        <CategoryIcon icon={cat.icon} className="h-4 w-4" />
                                    </div>
                                    <span className="truncate">{cat.name}</span>
                                </div>
                                {activeCategory === cat._id && <ChevronRight className="h-3 w-3 opacity-50" />}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-2">
                <CategoriesManager
                    trigger={
                        <button 
                            disabled={env?.readonly}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            title={env?.readonly ? "Managing categories is disabled in read-only/demo mode" : ""}
                        >
                            <Plus className="h-4 w-4" />
                            {categories.length === 0 ? 'Add Category' : 'Manage Categories'}
                        </button>
                    }
                />
            </div>

            <div className="flex-1" />

            <Link to="/settings"
                className={`
                    flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all mb-4
                    ${isSettings 
                        ? 'bg-slate-800 text-white shadow-lg shadow-slate-200' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}
                `}
            >
                <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4" />
                    Settings
                </div>
                {isSettings && <ChevronRight className="h-3 w-3 opacity-50" />}
            </Link>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <Link to="/profile" className="flex flex-col overflow-hidden px-2 hover:bg-slate-100 rounded-xl py-1 transition-colors flex-1" title="Go to Profile">
                    <span className="text-xs font-bold text-slate-900 truncate">{user?.email}</span>
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{user?.role}</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={logout} className="rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 ml-1" title="Log out">
                    <LogOut className="h-4 w-4" />
                </Button>
            </div>
        </nav>
    );

    return (
        <div className="min-h-screen bg-white font-sans antialiased text-slate-900 flex flex-col">
            {env?.demoMode && (
                <div className="bg-slate-900 text-white py-2 px-4 text-center text-[10px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-4 z-50">
                    <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-blue-400" />
                        Demo Mode Active
                    </div>
                    <span className="opacity-20 hidden md:inline">|</span>
                    <div className="opacity-60 hidden md:inline">Modifications are disabled to keep this environment clean.</div>
                </div>
            )}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:flex flex-col w-72 border-r border-slate-100 bg-slate-50/50 p-6">
                    <Link to="/" className="flex items-center gap-3 font-black text-2xl mb-10 px-2 tracking-tighter hover:opacity-80 transition-opacity">
                        <div className="bg-slate-800 p-1.5 rounded-xl shadow-lg shadow-slate-200">
                            <Activity className="h-6 w-6 text-white" aria-hidden="true" />
                        </div>
                        <span>Pa11y<span className="text-blue-600">Dash</span></span>
                    </Link>
                    {navContent}
                </aside>

                {/* Mobile Header */}
                <header className="lg:hidden h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white sticky top-0 z-40">
                    <Link to="/" className="flex items-center gap-2 font-black text-xl tracking-tighter">
                        <div className="bg-slate-800 p-1 rounded-lg">
                            <Activity className="h-5 w-5 text-white" aria-hidden="true" />
                        </div>
                        <span>Pa11y<span className="text-blue-600">Dash</span></span>
                    </Link>
                    
                    <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100 h-10 w-10">
                                <Menu className="h-6 w-6 text-slate-600" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xs h-[100dvh] left-0 top-0 translate-x-0 translate-y-0 rounded-none border-r border-slate-100 p-6 flex flex-col">
                            <DialogHeader className="flex flex-row items-center justify-between mb-8">
                                <DialogTitle className="text-xl font-black tracking-tighter">Navigation</DialogTitle>
                                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl h-10 w-10">
                                    <X className="h-6 w-6 text-slate-400" />
                                </Button>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto pr-2">
                                {navContent}
                            </div>
                        </DialogContent>
                    </Dialog>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto">
                    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
