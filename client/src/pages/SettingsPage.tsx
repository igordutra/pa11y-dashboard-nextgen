import { useState, useEffect } from 'react';
import { Save, RotateCcw, Server, Eye, Monitor, Clock, Shield, Info, CheckCircle2, Loader2, Activity, Users, Trash2, UserCog } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { PageHeading } from '../components/ui/PageHeading';
import { Card, CardContent } from '../components/ui/card';

interface IUser {
    _id: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    provider: string;
    createdAt: string;
}

interface Settings {
    _id: string;
    runners: string[];
    includeNotices: boolean;
    includeWarnings: boolean;
    viewport: { width: number; height: number; isMobile: boolean };
    timeout: number;
    wait: number;
    hideElements: string;
    rootElement: string;
    userAgent: string;
    ignore: string[];
    headers: Record<string, string>;
    concurrency: number;
}

interface Environment {
    pa11yVersion: string;
    nodeVersion: string;
    availableRunners: string[];
    availableStandards: string[];
    readonly: boolean;
    demoMode: boolean;
}

export function SettingsPage() {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'global' | 'users'>('global');
    const [settings, setSettings] = useState<Settings | null>(null);
    const [env, setEnv] = useState<Environment | null>(null);
    const [users, setUsers] = useState<IUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [ignoreInput, setIgnoreInput] = useState('');
    const [headerKey, setHeaderKey] = useState('');
    const [headerVal, setHeaderVal] = useState('');

    const isReadonly = env?.readonly;
    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get(`/api/settings`).then(r => r.data),
            api.get(`/api/environment`).then(r => r.data)
        ]).then(([s, e]) => {
            setSettings(s);
            setEnv(e);
            setLoading(false);
        }).catch(err => {
            console.error('Failed to load settings', err);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (activeTab === 'users' && isAdmin) {
            fetchUsers();
        }
    }, [activeTab, isAdmin]);

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const { data } = await api.get('/api/users');
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await api.put(`/api/users/${userId}/role`, { role: newRole });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setUsers(users.map(u => u._id === userId ? { ...u, role: newRole as any } : u));
        } catch (err) {
            console.error('Failed to update role', err);
            alert('Failed to update user role');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user account?')) return;
        try {
            await api.delete(`/api/users/${userId}`);
            setUsers(users.filter(u => u._id !== userId));
        } catch (err) {
            console.error('Failed to delete user', err);
            alert('Failed to delete user');
        }
    };

    const save = async () => {
        if (!settings || isReadonly) return;
        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...body } = settings;
        await api.put(`/api/settings`, body);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const reset = async () => {
        if (isReadonly) return;
        const defaults: Omit<Settings, '_id'> = {
            runners: ['axe'],
            includeNotices: false,
            includeWarnings: true,
            viewport: { width: 1280, height: 1024, isMobile: false },
            timeout: 30000,
            wait: 0,
            hideElements: '',
            rootElement: '',
            userAgent: '',
            ignore: [],
            headers: {},
            concurrency: 3
        };
        setSaving(true);
        const res = await api.put(`/api/settings`, defaults);
        setSettings(res.data);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const toggleRunner = (runner: string) => {
        if (!settings) return;
        const runners = settings.runners.includes(runner)
            ? settings.runners.filter(r => r !== runner)
            : [...settings.runners, runner];
        if (runners.length === 0) return; // Must have at least one
        setSettings({ ...settings, runners });
    };

    const addIgnoreRule = () => {
        if (!settings || !ignoreInput.trim()) return;
        setSettings({ ...settings, ignore: [...settings.ignore, ignoreInput.trim()] });
        setIgnoreInput('');
    };

    const removeIgnoreRule = (index: number) => {
        if (!settings) return;
        setSettings({ ...settings, ignore: settings.ignore.filter((_, i) => i !== index) });
    };

    const addHeader = () => {
        if (!settings || !headerKey.trim()) return;
        setSettings({ ...settings, headers: { ...settings.headers, [headerKey.trim()]: headerVal } });
        setHeaderKey('');
        setHeaderVal('');
    };

    const removeHeader = (key: string) => {
        if (!settings) return;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _, ...rest } = settings.headers;
        setSettings({ ...settings, headers: rest });
    };

    if (loading || !settings) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <PageHeading 
                title="Settings" 
                description={activeTab === 'global' ? 'Global Pa11y configuration — defaults for all scans' : 'Manage registered users and permissions'}
            >
                {activeTab === 'global' && (
                    <div className="flex gap-2">
                        <button onClick={reset}
                            disabled={isReadonly}
                            aria-label="Reset all settings to default values"
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            Reset Defaults
                        </button>
                        <button onClick={save} disabled={saving || isReadonly}
                            aria-busy={saving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : saved ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
                        </button>
                    </div>
                )}
            </PageHeading>

            {/* Tabs */}
            {isAdmin && (
                <div className="flex gap-1 p-1 bg-slate-100/50 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`px-6 py-2.5 text-sm font-bold transition-all rounded-xl ${activeTab === 'global' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Global Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-2.5 text-sm font-bold transition-all rounded-xl flex items-center gap-2 ${activeTab === 'users' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users className="h-4 w-4" />
                        User Management
                    </button>
                </div>
            )}

            {activeTab === 'global' ? (
                <div className="grid grid-cols-1 gap-8 max-w-4xl">
                    {/* Runner */}
                    <Section icon={<Server className="h-5 w-5" aria-hidden="true" />} title="Test Runner" description="Choose which accessibility testing engine(s) to use">
                        <div className="flex gap-3">
                            {['axe', 'htmlcs'].map(runner => (
                                <button key={runner} onClick={() => toggleRunner(runner)}
                                    aria-pressed={settings.runners.includes(runner)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${settings.runners.includes(runner)
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border bg-background text-muted-foreground hover:border-muted-foreground'
                                        }`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${settings.runners.includes(runner) ? 'bg-primary' : 'bg-muted-foreground/30'}`} aria-hidden="true" />
                                        {runner === 'axe' ? 'axe-core' : 'HTML_CodeSniffer'}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {runner === 'axe' ? 'Modern, comprehensive' : 'Legacy, WCAG2AAA support'}
                                    </div>
                                </button>
                            ))}
                        </div>
                        {settings.runners.length === 2 && (
                            <p className="text-xs text-muted-foreground mt-2">Both runners active — results will be combined.</p>
                        )}
                    </Section>

                    {/* Reporting */}
                    <Section icon={<Eye className="h-5 w-5" aria-hidden="true" />} title="Reporting" description="Control which issue types are included in reports">
                        <div className="space-y-3">
                            <Checkbox label="Include Warnings" description="Show issues that may need manual review"
                                checked={settings.includeWarnings}
                                onChange={v => setSettings({ ...settings, includeWarnings: v })} />
                            <Checkbox label="Include Notices" description="Show informational notices (not directly actionable)"
                                checked={settings.includeNotices}
                                onChange={v => setSettings({ ...settings, includeNotices: v })} />
                        </div>
                    </Section>

                    {/* Viewport */}
                    <Section icon={<Monitor className="h-5 w-5" aria-hidden="true" />} title="Viewport" description="Browser window dimensions for testing">
                        <div className="grid grid-cols-3 gap-4">
                            <NumberInput label="Width (px)" value={settings.viewport.width}
                                onChange={v => setSettings({ ...settings, viewport: { ...settings.viewport, width: v } })} />
                            <NumberInput label="Height (px)" value={settings.viewport.height}
                                onChange={v => setSettings({ ...settings, viewport: { ...settings.viewport, height: v } })} />
                            <div>
                                <label className="text-sm font-medium block mb-1.5">Mobile</label>
                                <Checkbox label="Simulate mobile" checked={settings.viewport.isMobile}
                                    onChange={v => setSettings({ ...settings, viewport: { ...settings.viewport, isMobile: v } })} />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            {[
                                { label: 'Desktop', w: 1280, h: 1024, m: false },
                                { label: 'Laptop', w: 1366, h: 768, m: false },
                                { label: 'Tablet', w: 768, h: 1024, m: true },
                                { label: 'Mobile', w: 375, h: 812, m: true },
                            ].map(p => (
                                <button key={p.label}
                                    aria-pressed={settings.viewport.width === p.w && settings.viewport.height === p.h && settings.viewport.isMobile === p.m}
                                    onClick={() => setSettings({ ...settings, viewport: { width: p.w, height: p.h, isMobile: p.m } })}
                                    className="px-3 py-1 text-xs rounded-md border hover:bg-accent transition-colors">
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </Section>

                    {/* Timing */}
                    <Section icon={<Clock className="h-5 w-5" aria-hidden="true" />} title="Timing" description="Control scan timeouts and wait periods">
                        <div className="grid grid-cols-2 gap-4">
                            <NumberInput label="Timeout (ms)" value={settings.timeout} description="Max time for entire test run (default: 30000)"
                                onChange={v => setSettings({ ...settings, timeout: v })} />
                            <NumberInput label="Wait before test (ms)" value={settings.wait} description="Delay before running tests (default: 0)"
                                onChange={v => setSettings({ ...settings, wait: v })} />
                        </div>
                    </Section>

                    {/* Concurrency */}
                    <Section icon={<Activity className="h-5 w-5" aria-hidden="true" />} title="Resource Management" description="Control system load and performance">
                        <div className="grid grid-cols-2 gap-4">
                            <NumberInput label="Concurrency" value={settings.concurrency} description="Maximum simultaneous scans (range: 1-10)"
                                onChange={v => setSettings({ ...settings, concurrency: Math.min(10, Math.max(1, v)) })} />
                        </div>
                    </Section>

                    {/* Advanced */}
                    <Section icon={<Shield className="h-5 w-5" aria-hidden="true" />} title="Advanced" description="Fine-tune element selection, user agent, and rule exclusions">
                        <div className="space-y-4">
                            <TextInput label="Hide Elements" value={settings.hideElements}
                                description="CSS selectors to hide from testing (comma-separated)"
                                placeholder=".cookie-banner, #modal, [aria-hidden]"
                                onChange={v => setSettings({ ...settings, hideElements: v })} />
                            <TextInput label="Root Element" value={settings.rootElement}
                                description="CSS selector to limit testing scope (empty = full document)"
                                placeholder="#main-content"
                                onChange={v => setSettings({ ...settings, rootElement: v })} />
                            <TextInput label="User Agent" value={settings.userAgent}
                                description="Custom User-Agent header (empty = Pa11y default)"
                                placeholder="Pa11y Dashboard/1.0"
                                onChange={v => setSettings({ ...settings, userAgent: v })} />

                            {/* Ignore Rules */}
                            <div>
                                <label className="text-sm font-medium block mb-1">Ignore Rules</label>
                                <p className="text-xs text-muted-foreground mb-2">WCAG rule codes to exclude from reports</p>
                                <div className="flex gap-2 mb-2">
                                    <input value={ignoreInput} onChange={e => setIgnoreInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addIgnoreRule()}
                                        placeholder="WCAG2AA.Principle1.Guideline1_3.1_3_1.H57.2"
                                        aria-label="Add WCAG rule to ignore"
                                        className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
                                    <button onClick={addIgnoreRule}
                                        className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {settings.ignore.map((rule, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs font-mono">
                                            {rule}
                                            <button onClick={() => removeIgnoreRule(i)} aria-label={`Remove ignore rule ${rule}`} className="text-muted-foreground hover:text-foreground ml-1">×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Headers */}
                            <div>
                                <label className="text-sm font-medium block mb-1">Custom HTTP Headers</label>
                                <p className="text-xs text-muted-foreground mb-2">Headers sent with Pa11y requests (e.g., cookies, auth)</p>
                                <div className="flex gap-2 mb-2">
                                    <input value={headerKey} onChange={e => setHeaderKey(e.target.value)}
                                        placeholder="Header name"
                                        aria-label="Custom header name"
                                        className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
                                    <input value={headerVal} onChange={e => setHeaderVal(e.target.value)}
                                        placeholder="Value"
                                        aria-label="Custom header value"
                                        onKeyDown={e => e.key === 'Enter' && addHeader()}
                                        className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
                                    <button onClick={addHeader}
                                        className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                                        Add
                                    </button>
                                </div>
                                {Object.entries(settings.headers).length > 0 && (
                                    <div className="rounded-md border overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50"><tr><th className="px-3 py-1.5 text-left font-medium">Header</th><th className="px-3 py-1.5 text-left font-medium">Value</th><th className="w-8"></th></tr></thead>
                                            <tbody>
                                                {Object.entries(settings.headers).map(([k, v]) => (
                                                    <tr key={k} className="border-t">
                                                        <td className="px-3 py-1.5 font-mono text-xs">{k}</td>
                                                        <td className="px-3 py-1.5 text-xs">{v}</td>
                                                        <td className="px-2"><button onClick={() => removeHeader(k)} aria-label={`Remove header ${k}`} className="text-muted-foreground hover:text-foreground">×</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Section>

                    {/* Environment Info */}
                    {env && (
                        <Section icon={<Info className="h-5 w-5" aria-hidden="true" />} title="Environment" description="System information (read-only)">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <InfoRow label="Pa11y Version" value={env.pa11yVersion} />
                                <InfoRow label="Node.js Version" value={env.nodeVersion} />
                                <InfoRow label="Available Runners" value={env.availableRunners.join(', ')} />
                                <InfoRow label="Supported Standards" value={env.availableStandards.join(', ')} />
                            </div>
                        </Section>
                    )}
                </div>
            ) : (
                /* User Management Tab */
                <div className="space-y-6 max-w-5xl">
                    <Card className="border-none shadow-md shadow-slate-200/50 overflow-hidden">
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">User</th>
                                        <th className="px-6 py-4 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Role</th>
                                        <th className="px-6 py-4 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Provider</th>
                                        <th className="px-6 py-4 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">Joined</th>
                                        <th className="px-6 py-4 text-right font-bold text-slate-400 uppercase tracking-widest text-[10px]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {usersLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                                No users found.
                                            </td>
                                        </tr>
                                    ) : users.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700">{u.email}</div>
                                                <div className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-tighter">{u._id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={u.role}
                                                    disabled={u._id === currentUser?.id}
                                                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                                                >
                                                    <option value="viewer">Viewer</option>
                                                    <option value="editor">Editor</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter bg-slate-100 text-slate-500">
                                                    {u.provider}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-medium">
                                                {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteUser(u._id)}
                                                    disabled={u._id === currentUser?.id}
                                                    className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-0 disabled:cursor-default"
                                                    title="Delete user"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                    
                    <div className="flex items-start gap-4 p-6 bg-blue-50/50 border border-blue-100 rounded-3xl">
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                            <UserCog className="h-5 w-5" />
                        </div>
                        <div className="text-sm">
                            <p className="font-black text-blue-900 uppercase tracking-widest text-xs mb-2">User Management Tips</p>
                            <ul className="space-y-1.5 text-blue-800/70 font-medium">
                                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-400" /> You cannot change your own role or delete your own account.</li>
                                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-400" /> New OAuth users are automatically assigned the <strong>viewer</strong> role.</li>
                                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-400" /> Assigning <strong>editor</strong> allows users to manage targets but not system settings.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- Sub-components ---------- */

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-md shadow-slate-200/50">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-50 rounded-xl text-blue-600">
                    {icon}
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-800">{title}</h2>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-6">{description}</p>
            {children}
        </div>
    );
}

function Checkbox({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-start gap-4 cursor-pointer group">
            <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200' : 'border-slate-200 group-hover:border-slate-300'}`}>
                {checked && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>
            <div>
                <span className="text-sm font-black text-slate-700">{label}</span>
                {description && <p className="text-xs font-medium text-slate-400">{description}</p>}
            </div>
        </label>
    );
}

function NumberInput({ label, value, description, onChange }: { label: string; value: number; description?: string; onChange: (v: number) => void }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{label}</label>
            {description && <p className="text-[10px] font-medium text-slate-400 italic mb-1">{description}</p>}
            <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner" />
        </div>
    );
}

function TextInput({ label, value, description, placeholder, onChange }: { label: string; value: string; description?: string; placeholder?: string; onChange: (v: string) => void }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{label}</label>
            {description && <p className="text-[10px] font-medium text-slate-400 italic mb-1">{description}</p>}
            <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner placeholder:font-medium placeholder:text-slate-300" />
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <span className="font-bold text-sm text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{value}</span>
        </div>
    );
}
