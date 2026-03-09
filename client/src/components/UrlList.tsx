import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { UrlCard } from './UrlCard';
import { Url } from '../types';
import { SortOption } from '../pages/DashboardPage';
import { Globe, Plus } from 'lucide-react';
import { AddUrlModal } from './AddUrlModal';
import { Button } from './ui/button';

interface UrlListProps {
    sortBy?: SortOption;
}

export function UrlList({ sortBy = 'newest' }: UrlListProps) {
    const [searchParams] = useSearchParams();
    const activeCategory = searchParams.get('category');

    const { data: urls, isLoading, error } = useQuery<Url[]>({
        queryKey: ['urls'],
        queryFn: async () => {
            const res = await api.get('/api/urls');
            return res.data;
        },
        refetchInterval: (query) => {
            const urls = query.state.data as Url[];
            return urls?.some(u => u.status === 'scanning') ? 5000 : false;
        }
    });

    if (isLoading) return <div className="p-4">Loading URLs...</div>;
    if (error) return <div className="p-4 text-red-500">Error loading URLs</div>;

    if (urls && urls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 mt-4">
                <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100 mb-5">
                    <Globe className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">No targets to monitor</h3>
                <p className="text-slate-500 mb-8 max-w-md">
                    Start monitoring accessibility by adding your first website or application URL. You can configure scheduled scans and interaction scripts.
                </p>
                <AddUrlModal 
                    triggerButton={
                        <Button className="rounded-xl font-bold px-6 py-6 bg-slate-800 hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-200 border-none text-base">
                            <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
                            Add Your First URL
                        </Button>
                    } 
                />
            </div>
        );
    }

    // Filter by category if one is selected
    let filtered = activeCategory
        ? urls?.filter((url) => url.categoryId === activeCategory)
        : urls;

    // Apply sorting
    if (filtered) {
        filtered = [...filtered].sort((a, b) => {
            if (sortBy === 'name') {
                const nameA = (a.name || a.url).toLowerCase();
                const nameB = (b.name || b.url).toLowerCase();
                return nameA.localeCompare(nameB);
            }
            if (sortBy === 'score') {
                const scoreA = a.lastScore ?? 101; // Not scanned goes to bottom
                const scoreB = b.lastScore ?? 101;
                return scoreA - scoreB;
            }
            // newest is the default from API (createdAt desc), 
            // but we can re-ensure it if needed using _id or timestamps if available
            return 0; 
        });
    }

    if (filtered && filtered.length === 0 && activeCategory) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium mb-1">No URLs in this category</p>
                <p className="text-sm">Assign URLs to this category using the Edit button on each URL card.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered?.map((url) => (
                <UrlCard key={url._id} url={url} />
            ))}
        </div>
    );
}
