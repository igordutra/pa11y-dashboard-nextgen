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
import { Pencil, AlertTriangle } from 'lucide-react';
import { ActionEditor } from './ActionEditor';
import { Action } from '../types';
import { CategorySelect } from './CategorySelect';
import { CronEditor } from './CronEditor';

interface UrlOverrides {
    runners?: string[];
    includeNotices?: boolean;
    includeWarnings?: boolean;
    timeout?: number;
    wait?: number;
    viewport?: { width: number; height: number; isMobile: boolean };
    hideElements?: string;
    rootElement?: string;
    userAgent?: string;
    ignore?: string[];
    headers?: Record<string, string>;
}

interface EditUrlDialogProps {
    urlData: {
        _id: string;
        url: string;
        name?: string;
        standard?: string;
        schedule: string;
        actions?: Action[];
        overrides?: UrlOverrides;
        categoryId?: string | null;
    };
}

export function EditUrlDialog({ urlData }: EditUrlDialogProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'basic' | 'script' | 'overrides'>('basic');
    const [name, setName] = useState(urlData.name || '');
    const [standard, setStandard] = useState(urlData.standard || 'WCAG2AA');
    const [schedule, setSchedule] = useState(urlData.schedule);
    const [actions, setActions] = useState<Action[]>(urlData.actions || []);
    const [overrides, setOverrides] = useState<UrlOverrides>(urlData.overrides || {});
    const [enableOverrides, setEnableOverrides] = useState(!!urlData.overrides && Object.keys(urlData.overrides).length > 0);
    const [categoryId, setCategoryId] = useState<string | null>(urlData.categoryId || null);

    const queryClient = useQueryClient();

    const { data: apiStatus } = useQuery({
        queryKey: ['apiStatus'],
        queryFn: async () => (await api.get('/api')).data,
    });
    const isDemoMode = !!apiStatus?.demoMode;

    const mutation = useMutation({
        mutationFn: async (updatedUrl: { name?: string; standard?: string; schedule?: string; actions: Action[]; overrides?: UrlOverrides; categoryId?: string | null }) => {
            const res = await api.put(`/api/urls/${urlData._id}`, updatedUrl);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['urls'] });
            setOpen(false);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ name, standard, schedule, actions, overrides: enableOverrides ? overrides : undefined, categoryId });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" aria-label={`Edit configuration for ${urlData.url}`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit URL</DialogTitle>
                        <DialogDescription>
                            Update settings for {urlData.url}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 border-b mb-4 mt-2" role="tablist">
                        <Button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'basic'}
                            aria-controls="basic-panel"
                            id="basic-tab"
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
                            aria-controls="script-panel"
                            id="script-tab"
                            variant={activeTab === 'script' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('script')}
                            className="rounded-b-none"
                        >
                            Script / Actions
                        </Button>
                        <Button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'overrides'}
                            aria-controls="overrides-panel"
                            id="overrides-tab"
                            variant={activeTab === 'overrides' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('overrides')}
                            className="rounded-b-none"
                        >
                            Pa11y Overrides
                        </Button>
                    </div>

                    <div className="py-2">
                        {activeTab === 'basic' ? (
                            <div id="basic-panel" role="tabpanel" aria-labelledby="basic-tab" className="grid gap-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-name" className="text-right">
                                        Name
                                    </Label>
                                    <Input
                                        id="edit-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="My Site"
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-standard" className="text-right">
                                        Standard
                                    </Label>
                                    <select
                                        id="edit-standard"
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
                                    <Label htmlFor="edit-schedule" className="text-right pt-2">
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
                        ) : activeTab === 'script' ? (
                            <div id="script-panel" role="tabpanel" aria-labelledby="script-tab">
                                <ActionEditor actions={actions} onChange={setActions} />
                            </div>
                        ) : (
                            <div id="overrides-panel" role="tabpanel" aria-labelledby="overrides-tab" className="grid gap-4">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" id="enable-overrides" checked={enableOverrides}
                                        onChange={e => setEnableOverrides(e.target.checked)}
                                        className="h-4 w-4 rounded border-input" />
                                    <Label htmlFor="enable-overrides">Enable per-URL overrides</Label>
                                </div>
                                {enableOverrides && (
                                    <>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right">Runner</Label>
                                            <div className="col-span-3 flex gap-2">
                                                {['axe', 'htmlcs'].map(r => (
                                                    <button key={r} type="button" onClick={() => {
                                                        const cur = overrides.runners || [];
                                                        const next = cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r];
                                                        setOverrides({ ...overrides, runners: next.length ? next : undefined });
                                                    }}
                                                        className={`px-3 py-1 text-xs rounded-md border ${(overrides.runners || []).includes(r) ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground'}`}>
                                                        {r === 'axe' ? 'axe-core' : 'htmlcs'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right">Timeout (ms)</Label>
                                            <Input type="number" value={overrides.timeout ?? ''}
                                                onChange={e => setOverrides({ ...overrides, timeout: e.target.value ? Number(e.target.value) : undefined })}
                                                placeholder="Global default" className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right">Wait (ms)</Label>
                                            <Input type="number" value={overrides.wait ?? ''}
                                                onChange={e => setOverrides({ ...overrides, wait: e.target.value ? Number(e.target.value) : undefined })}
                                                placeholder="Global default" className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right">Viewport W</Label>
                                            <Input type="number" value={overrides.viewport?.width ?? ''}
                                                onChange={e => setOverrides({ ...overrides, viewport: { width: Number(e.target.value) || 1280, height: overrides.viewport?.height || 1024, isMobile: overrides.viewport?.isMobile || false } })}
                                                placeholder="1280" className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right">Viewport H</Label>
                                            <Input type="number" value={overrides.viewport?.height ?? ''}
                                                onChange={e => setOverrides({ ...overrides, viewport: { width: overrides.viewport?.width || 1280, height: Number(e.target.value) || 1024, isMobile: overrides.viewport?.isMobile || false } })}
                                                placeholder="1024" className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label className="text-right">Hide Elements</Label>
                                            <Input value={overrides.hideElements ?? ''}
                                                onChange={e => setOverrides({ ...overrides, hideElements: e.target.value || undefined })}
                                                placeholder=".cookie-banner, #modal" className="col-span-3" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
