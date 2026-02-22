import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { CategoryIcon } from './CategoriesManager';

interface Category {
    _id: string;
    name: string;
    description?: string;
    icon: string;
    color: string;
}

interface CategorySelectProps {
    value: string | null;
    onChange: (value: string | null) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => (await api.get('/api/categories')).data,
    });

    if (categories.length === 0) return null;

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <div className="flex gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    aria-pressed={!value}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${!value
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/20 text-primary'
                        : 'border-transparent bg-muted hover:bg-muted/80 text-muted-foreground'
                        }`}
                >
                    None
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat._id}
                        type="button"
                        onClick={() => onChange(cat._id)}
                        aria-pressed={value === cat._id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${value === cat._id
                            ? 'ring-1 ring-primary/20'
                            : 'border-transparent hover:bg-muted/80'
                            }`}
                        style={value === cat._id
                            ? { borderColor: cat.color, backgroundColor: cat.color + '15', color: cat.color }
                            : { backgroundColor: cat.color + '10', color: cat.color }
                        }
                    >
                        <CategoryIcon icon={cat.icon} className="h-3.5 w-3.5" />
                        {cat.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
