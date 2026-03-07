import { useRef } from 'react';
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
    { label: 'None', cron: '' },
    { label: 'Weekly (Sun)', cron: '0 0 * * 0' },
    { label: 'Monthly (1st)', cron: '0 0 1 * *' },
];

export function CronEditor({ value, onChange, disabled }: CronEditorProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const isCustom = !PRESETS.some(p => p.cron === value);
    // Derived state for human readable description
    let humanReadable = '';
    let error: string | null = null;

    if (value && value.trim() !== '') {
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
                        key={preset.label}
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
                    variant={isCustom ? 'default' : 'outline'}
                    size="xs"
                    className="text-[10px] h-7"
                    onClick={() => {
                        inputRef.current?.focus();
                    }}
                    aria-pressed={isCustom}
                    disabled={disabled}
                >
                    Custom
                </Button>
            </div>

            <div className="space-y-1.5">
                <Input
                    id="cron-input"
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="None (Manual only)"
                    className={`font-mono ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    required={false}
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
                    ) : value === '' ? (
                        <p id="cron-description" className="text-[10px] text-muted-foreground">No schedule. Scans must be triggered manually.</p>
                    ) : (
                        <p id="cron-description" className="text-[10px] text-muted-foreground">Enter a 5-segment cron expression (minute, hour, day, month, day-of-week).</p>
                    )}
                </div>
            </div>
        </div>
    );
}
