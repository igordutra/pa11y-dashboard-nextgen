import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { UrlCard } from './UrlCard';
import { Url } from '../types';
import { SortOption } from '../pages/DashboardPage';

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
