import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, AlertTriangle } from 'lucide-react';
import { ActionEditor } from './ActionEditor';
import { Action } from '../types';
import { CategorySelect } from './CategorySelect';
import { CronEditor } from './CronEditor';

export function AddUrlModal() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'basic' | 'script'>('basic');
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [standard, setStandard] = useState('WCAG2AA');
    const [schedule, setSchedule] = useState('0 * * * *');
    const [actions, setActions] = useState<Action[]>([]);
    const [categoryId, setCategoryId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const { data: apiStatus } = useQuery({
        queryKey: ['apiStatus'],
        queryFn: async () => (await api.get('/api')).data,
    });
    const isDemoMode = !!apiStatus?.demoMode;

    const mutation = useMutation({
        mutationFn: async (newUrl: { url: string; name?: string; standard?: string; schedule?: string; actions: Action[]; categoryId?: string | null }) => {
            const res = await api.post('/api/urls', newUrl);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['urls'] });
            setOpen(false);
            setUrl('');
            setName('');
            setStandard('WCAG2AA');
            setSchedule('0 * * * *');
            setActions([]);
            setCategoryId(null);
            setActiveTab('basic');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ url, name, standard, schedule, actions, categoryId });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Add URL
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add URL</DialogTitle>
                        <DialogDescription>
                            Configure a URL to monitor. Use the Script tab to define interaction steps.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 border-b mb-4 mt-2" role="tablist">
                        <Button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'basic'}
                            aria-controls="add-basic-panel"
                            id="add-basic-tab"
                            variant={activeTab === 'basic' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('basic')}
                            className="rounded-b-none"
                        >
                            Basic Settings
                        </Button>
                        <Button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'script'}
                            aria-controls="add-script-panel"
                            id="add-script-tab"
                            variant={activeTab === 'script' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('script')}
                            className="rounded-b-none"
                        >
                            Script / Actions
                        </Button>
                    </div>

                    <div className="py-2">
                        {activeTab === 'basic' ? (
                            <div id="add-basic-panel" role="tabpanel" aria-labelledby="add-basic-tab" className="grid gap-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                        Name
                                    </Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="My Site"
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="url" className="text-right">
                                        URL
                                    </Label>
                                    <Input
                                        id="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        className="col-span-3"
                                        required
                                        type="url"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="standard" className="text-right">
                                        Standard
                                    </Label>
                                    <select
                                        id="standard"
                                        value={standard}
                                        onChange={(e) => setStandard(e.target.value)}
                                        className="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="WCAG2A">WCAG 2.0 A</option>
                                        <option value="WCAG2AA">WCAG 2.0 AA</option>
                                        <option value="WCAG2AAA">WCAG 2.0 AAA</option>
                                        <option value="WCAG21A">WCAG 2.1 A</option>
                                        <option value="WCAG21AA">WCAG 2.1 AA</option>
                                        <option value="WCAG21AAA">WCAG 2.1 AAA</option>
                                        <option value="WCAG22A">WCAG 2.2 A</option>
                                        <option value="WCAG22AA">WCAG 2.2 AA</option>
                                        <option value="WCAG22AAA">WCAG 2.2 AAA</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="schedule" className="text-right pt-2">
                                        Schedule (Cron)
                                    </Label>
                                    <div className="col-span-3">
                                        {isDemoMode && (
                                            <div className="mb-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 p-2 rounded">
                                                <AlertTriangle className="h-3 w-3" />
                                                Background scheduling is disabled in Demo Mode to prevent server overload. You can still trigger manual scans.
                                            </div>
                                        )}
                                        <CronEditor value={schedule} onChange={setSchedule} disabled={isDemoMode} />
                                    </div>
                                </div>
                                <CategorySelect value={categoryId} onChange={setCategoryId} />
                            </div>
                        ) : (
                            <div id="add-script-panel" role="tabpanel" aria-labelledby="add-script-tab">
                                <ActionEditor actions={actions} onChange={setActions} />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-4">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
