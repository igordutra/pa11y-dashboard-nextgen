import { Input } from './ui/input';
import { Button } from './ui/button';
import cronstrue from 'cronstrue';
import { Info } from 'lucide-react';

interface CronEditorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

const PRESETS = [
    { label: 'Hourly', cron: '0 * * * *' },
    { label: 'Daily (Midnight)', cron: '0 0 * * *' },
    { label: 'Weekly (Sun)', cron: '0 0 * * 0' },
    { label: 'Monthly (1st)', cron: '0 0 1 * *' },
];

export function CronEditor({ value, onChange, disabled }: CronEditorProps) {
    // Derived state for human readable description
    let humanReadable = '';
    let error: string | null = null;

    if (value) {
        try {
            humanReadable = cronstrue.toString(value, {
                use24HourTimeFormat: true,
                throwExceptionOnParseError: true,
            });
        } catch {
            error = 'Invalid cron expression';
        }
    }

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
                        aria-pressed={value === preset.cron}
                        disabled={disabled}
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
                    aria-pressed={!PRESETS.some(p => p.cron === value)}
                    disabled={disabled}
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
                    disabled={disabled}
                    aria-label="Cron expression"
                    aria-invalid={!!error}
                    aria-describedby={error ? "cron-error" : "cron-description"}
                />

                <div className="flex items-start gap-2 min-h-[1.5rem]">
                    {error ? (
                        <p id="cron-error" className="text-[10px] text-red-500 font-medium">{error}</p>
                    ) : humanReadable ? (
                        <div id="cron-description" className="flex items-center gap-1.5 text-[10px] text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-200">
                            <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>Runs {humanReadable.toLowerCase()}</span>
                        </div>
                    ) : (
                        <p id="cron-description" className="text-[10px] text-muted-foreground">Enter a 5-segment cron expression (minute, hour, day, month, day-of-week).</p>
                    )}
                </div>
            </div>
        </div>
    );
}
