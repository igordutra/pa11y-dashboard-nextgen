import { useState, useEffect } from 'react';
import { Save, RotateCcw, Server, Eye, Monitor, Clock, Shield, Info, CheckCircle2, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

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
}

interface Environment {
    pa11yVersion: string;
    nodeVersion: string;
    availableRunners: string[];
    availableStandards: string[];
}

export function SettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [env, setEnv] = useState<Environment | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [ignoreInput, setIgnoreInput] = useState('');
    const [headerKey, setHeaderKey] = useState('');
    const [headerVal, setHeaderVal] = useState('');

    useEffect(() => {
        Promise.all([
            fetch(`${API}/api/settings`).then(r => r.json()),
            fetch(`${API}/api/environment`).then(r => r.json())
        ]).then(([s, e]) => {
            setSettings(s);
            setEnv(e);
            setLoading(false);
        });
    }, []);

    const save = async () => {
        if (!settings) return;
        setSaving(true);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...body } = settings;
        await fetch(`${API}/api/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const reset = async () => {
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
            headers: {}
        };
        setSaving(true);
        const res = await fetch(`${API}/api/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(defaults)
        });
        const updated = await res.json();
        setSettings(updated);
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
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">Global Pa11y configuration — defaults for all scans</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={reset}
                        aria-label="Reset all settings to default values"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Reset Defaults
                    </button>
                    <button onClick={save} disabled={saving}
                        aria-busy={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : saved ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
                    </button>
                </div>
            </div>

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
    );
}

/* ---------- Sub-components ---------- */

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-primary">{icon}</span>
                <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
            {children}
        </div>
    );
}

function Checkbox({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-input group-hover:border-muted-foreground'}`}>
                {checked && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>
            <div>
                <span className="text-sm font-medium">{label}</span>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
        </label>
    );
}

function NumberInput({ label, value, description, onChange }: { label: string; value: number; description?: string; onChange: (v: number) => void }) {
    return (
        <div>
            <label className="text-sm font-medium block mb-1">{label}</label>
            {description && <p className="text-xs text-muted-foreground mb-1">{description}</p>}
            <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
        </div>
    );
}

function TextInput({ label, value, description, placeholder, onChange }: { label: string; value: string; description?: string; placeholder?: string; onChange: (v: string) => void }) {
    return (
        <div>
            <label className="text-sm font-medium block mb-1">{label}</label>
            {description && <p className="text-xs text-muted-foreground mb-1">{description}</p>}
            <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground/50" />
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span className="font-mono text-sm">{value}</span>
        </div>
    );
}
