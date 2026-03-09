import { useCallback, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Trash2, Plus, ArrowUp, ArrowDown, MonitorPlay } from 'lucide-react';
import { Action } from '../types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { VisualRecorder } from './VisualRecorder';

interface ActionEditorProps {
    actions: Action[];
    onChange: React.Dispatch<React.SetStateAction<Action[]>>;
    targetUrl?: string;
}

export function ActionEditor({ actions, onChange, targetUrl }: ActionEditorProps) {
    const [isRecorderOpen, setIsRecorderOpen] = useState(false);

    const addAction = useCallback(() => {
        onChange([...actions, { type: 'wait', value: '1000', label: '' }]);
    }, [actions, onChange]);

    const removeAction = useCallback((index: number) => {
        const newActions = [...actions];
        newActions.splice(index, 1);
        onChange(newActions);
    }, [actions, onChange]);

    const updateAction = useCallback((index: number, field: keyof Action, value: string) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], [field]: value };
        onChange(newActions);
    }, [actions, onChange]);

    const moveAction = useCallback((index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === actions.length - 1) return;

        const newActions = [...actions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        [newActions[index], newActions[targetIndex]] = [newActions[targetIndex], newActions[index]];

        onChange(newActions);
    }, [actions, onChange]);

    const handleActionRecorded = useCallback((newAction: Action) => {
        onChange((prevActions: Action[]) => [...prevActions, newAction]);
    }, [onChange]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Label>Script Actions</Label>
                <div className="flex gap-2">
                    {targetUrl && (
                        <Dialog open={isRecorderOpen} onOpenChange={setIsRecorderOpen}>
                            <DialogTrigger asChild>
                                <Button type="button" variant="secondary" size="sm" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                                    <MonitorPlay className="mr-2 h-4 w-4" aria-hidden="true" /> Visual Record
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>Visual Script Recorder</DialogTitle>
                                    <DialogDescription>
                                        Interact with {targetUrl} to automatically generate script actions.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex-1 mt-2 min-h-0">
                                    <VisualRecorder targetUrl={targetUrl} onActionRecorded={handleActionRecorded} />
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={addAction}>
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add Action
                    </Button>
                </div>
            </div>

            {actions.length === 0 && (
                <div className="text-center p-4 border border-dashed rounded-md text-muted-foreground text-sm">
                    No actions defined. The scan will only process the initial page load.
                </div>
            )}

            <div className="space-y-2">
                {actions.map((action, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 border rounded-md bg-card">
                        <div className="flex flex-col gap-1 pt-2">
                            <span className="text-xs font-mono text-muted-foreground w-6">{index + 1}.</span>
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                                <div className="w-1/3">
                                    <select
                                        value={action.type}
                                        onChange={(e) => updateAction(index, 'type', e.target.value)}
                                        aria-label={`Action ${index + 1} type`}
                                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="wait">Wait (ms)</option>
                                        <option value="click">Click (Selector)</option>
                                        <option value="type">Type (Selector|Text)</option>
                                        <option value="wait-for-url">Wait for Nav</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <Input
                                        value={action.value}
                                        onChange={(e) => updateAction(index, 'value', e.target.value)}
                                        aria-label={`Action ${index + 1} value`}
                                        placeholder={
                                            action.type === 'wait' ? '1000' :
                                                action.type === 'click' ? '#btn or iframe >>> #btn' :
                                                    action.type === 'type' ? '#search|query or iframe >>> #input|text' : 'timeout(ms) or empty'
                                        }
                                        className="h-8"
                                    />
                                </div>
                            </div>
                            <div>
                                <Input
                                    value={action.label || ''}
                                    onChange={(e) => updateAction(index, 'label', e.target.value)}
                                    aria-label={`Action ${index + 1} optional label`}
                                    placeholder="Label (optional, e.g., 'Submit Login')"
                                    className="h-7 text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === 0}
                                onClick={() => moveAction(index, 'up')}
                                aria-label="Move action up"
                            >
                                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === actions.length - 1}
                                onClick={() => moveAction(index, 'down')}
                                aria-label="Move action down"
                            >
                                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => removeAction(index)}
                                aria-label={`Remove action ${index + 1}${action.label ? `: ${action.label}` : ''}`}
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
