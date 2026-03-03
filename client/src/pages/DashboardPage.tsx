import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UrlList } from '../components/UrlList';
import { AddUrlModal } from '../components/AddUrlModal';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '../components/ui/select';
import { ListFilter } from 'lucide-react';

export type SortOption = 'name' | 'score' | 'newest';

export function DashboardPage() {
    const [searchParams] = useSearchParams();
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const activeCategory = searchParams.get('category');

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {activeCategory ? 'Viewing category' : 'Monitoring all accessibility targets'}
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl border border-slate-200/60">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500">
                            <ListFilter className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Sort by</span>
                        </div>
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                            <SelectTrigger className="w-[180px] border-none shadow-none bg-white rounded-lg h-9 font-medium text-slate-700 focus:ring-0">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                <SelectItem value="newest" className="rounded-lg">Recently Added</SelectItem>
                                <SelectItem value="name" className="rounded-lg">Name (A-Z)</SelectItem>
                                <SelectItem value="score" className="rounded-lg">Score (Lowest First)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <AddUrlModal />
                </div>
            </div>

            <UrlList sortBy={sortBy} />
        </div>
    );
}
