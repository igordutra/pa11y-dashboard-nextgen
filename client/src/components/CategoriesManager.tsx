import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import {
    Folder, Globe, Building, ShoppingCart, Heart,
    Star, Bookmark, Flag, Shield, Zap,
    Briefcase, Code, Database, Layout, Monitor,
    Phone, Users, Truck, GraduationCap, Newspaper,
    Plus, Pencil, Trash2, Tags
} from 'lucide-react';

// Map icon names to Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
    'folder': Folder,
    'globe': Globe,
    'building': Building,
    'shopping-cart': ShoppingCart,
    'heart': Heart,
    'star': Star,
    'bookmark': Bookmark,
    'flag': Flag,
    'shield': Shield,
    'zap': Zap,
    'briefcase': Briefcase,
    'code': Code,
    'database': Database,
    'layout': Layout,
    'monitor': Monitor,
    'phone': Phone,
    'users': Users,
    'truck': Truck,
    'graduation-cap': GraduationCap,
    'newspaper': Newspaper,
};

const ICON_NAMES = Object.keys(ICON_MAP);

const COLOR_PRESETS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#64748b', '#78716c',
];

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
    const IconComponent = ICON_MAP[icon] || Folder;
    return <IconComponent className={className || 'h-4 w-4'} aria-hidden="true" />;
}

interface Category {
    _id: string;
    name: string;
    description?: string;
    icon: string;
    color: string;
    order: number;
}

export function CategoriesManager({ trigger }: { trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formIcon, setFormIcon] = useState('folder');
    const [formColor, setFormColor] = useState('#6366f1');
    const queryClient = useQueryClient();

    const { data: categories = [] } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => (await api.get('/api/categories')).data,
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<Category>) => api.post('/api/categories', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
            api.put(`/api/categories/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['urls'] });
        }
    });

    const resetForm = () => {
        setFormName('');
        setFormDescription('');
        setFormIcon('folder');
        setFormColor('#6366f1');
        setEditingCategory(null);
        setIsCreating(false);
    };

    const startCreate = () => {
        resetForm();
        setIsCreating(true);
    };

    const startEdit = (cat: Category) => {
        setFormName(cat.name);
        setFormDescription(cat.description || '');
        setFormIcon(cat.icon);
        setFormColor(cat.color);
        setEditingCategory(cat);
        setIsCreating(false);
    };

    const handleSubmit = () => {
        const data = { name: formName, description: formDescription, icon: formIcon, color: formColor };
        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory._id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const showForm = isCreating || editingCategory;

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="gap-2">
                        <Tags className="h-4 w-4" aria-hidden="true" />
                        Manage Categories
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editingCategory ? 'Edit Category' : isCreating ? 'New Category' : 'Categories'}
                    </DialogTitle>
                    <DialogDescription>
                        {showForm ? 'Configure the category details below.' : 'Organize your URLs into categories for easy filtering.'}
                    </DialogDescription>
                </DialogHeader>

                {showForm ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cat-name">Name</Label>
                            <Input
                                id="cat-name"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="e.g. Government Sites"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat-desc">Description (optional)</Label>
                            <Input
                                id="cat-desc"
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="e.g. Public sector client sites"
                            />
                        </div>

                        {/* Icon picker */}
                        <div className="space-y-2">
                            <Label>Icon</Label>
                            <div className="grid grid-cols-10 gap-1">
                                {ICON_NAMES.map((name) => {
                                    const Icon = ICON_MAP[name];
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => setFormIcon(name)}
                                            className={`p-2 rounded-md border transition-all flex items-center justify-center ${formIcon === name
                                                ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                                                : 'border-transparent hover:bg-muted'
                                                }`}
                                            title={name}
                                            aria-label={`Select ${name} icon`}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Color picker */}
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2 flex-wrap">
                                {COLOR_PRESETS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormColor(color)}
                                        className={`w-7 h-7 rounded-full border-2 transition-all ${formColor === color
                                            ? 'border-foreground scale-110 ring-2 ring-primary/30'
                                            : 'border-transparent hover:scale-105'
                                            }`}
                                        style={{ backgroundColor: color }}
                                        aria-label={`Select color ${color}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={resetForm}>Cancel</Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!formName.trim() || createMutation.isPending || updateMutation.isPending}
                            >
                                {editingCategory ? 'Save Changes' : 'Create Category'}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <ScrollArea className="max-h-[350px]">
                            {categories.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No categories yet. Create one to organize your URLs.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {categories.map((cat) => (
                                        <div
                                            key={cat._id}
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className="p-2 rounded-md"
                                                    style={{ backgroundColor: cat.color + '20', color: cat.color }}
                                                >
                                                    <CategoryIcon icon={cat.icon} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-sm truncate">{cat.name}</div>
                                                    {cat.description && (
                                                        <div className="text-xs text-muted-foreground truncate">{cat.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button variant="ghost" size="sm" onClick={() => startEdit(cat)} aria-label={`Edit category ${cat.name}`}>
                                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    aria-label={`Delete category ${cat.name}`}
                                                    onClick={() => {
                                                        if (confirm(`Delete "${cat.name}"? URLs won't be deleted, just uncategorized.`)) {
                                                            deleteMutation.mutate(cat._id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        <Button onClick={startCreate} className="w-full gap-2" variant="outline">
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            New Category
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
