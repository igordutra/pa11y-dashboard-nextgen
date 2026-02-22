import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import cronstrue from 'cronstrue';
import { Info } from 'lucide-react';

interface CronEditorProps {
    value: string;
    onChange: (value: string) => void;
}

const PRESETS = [
    { label: 'Hourly', cron: '0 * * * *' },
    { label: 'Daily (Midnight)', cron: '0 0 * * *' },
    { label: 'Weekly (Sun)', cron: '0 0 * * 0' },
    { label: 'Monthly (1st)', cron: '0 0 1 * *' },
];

export function CronEditor({ value, onChange }: CronEditorProps) {
    const [humanReadable, setHumanReadable] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!value) {
            setHumanReadable('');
            setError(null);
            return;
        }

        try {
            const description = cronstrue.toString(value, {
                use24HourTimeFormat: true,
                throwExceptionOnParseError: true,
            });
            setHumanReadable(description);
            setError(null);
        } catch (err) {
            setHumanReadable('');
            setError('Invalid cron expression');
        }
    }, [value]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                    <Button
                        key={preset.cron}
                        type="button"
                        variant={value === preset.cron ? 'default' : 'outline'}
                        size="xs"
                        className="text-[10px] h-7"
                        onClick={() => onChange(preset.cron)}
                    >
                        {preset.label}
                    </Button>
                ))}
                <Button
                    type="button"
                    variant={PRESETS.some(p => p.cron === value) ? 'outline' : 'default'}
                    size="xs"
                    className="text-[10px] h-7"
                    onClick={() => {
                        if (PRESETS.some(p => p.cron === value)) {
                            // Don't change if already custom, but highlight it
                        }
                    }}
                >
                    Custom
                </Button>
            </div>

            <div className="space-y-1.5">
                <Input
                    id="cron-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="0 * * * *"
                    className={`font-mono ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required
                />

                <div className="flex items-start gap-2 min-h-[1.5rem]">
                    {error ? (
                        <p className="text-[10px] text-red-500 font-medium">{error}</p>
                    ) : humanReadable ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-200">
                            <Info className="h-3 w-3 shrink-0" />
                            <span>Runs {humanReadable.toLowerCase()}</span>
                        </div>
                    ) : (
                        <p className="text-[10px] text-muted-foreground">Enter a 5-segment cron expression (minute, hour, day, month, day-of-week).</p>
                    )}
                </div>
            </div>
        </div>
    );
}
