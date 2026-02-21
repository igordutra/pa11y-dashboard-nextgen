import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { Action } from '../types';

interface ActionEditorProps {
    actions: Action[];
    onChange: (actions: Action[]) => void;
}

export function ActionEditor({ actions, onChange }: ActionEditorProps) {
    const addAction = () => {
        onChange([...actions, { type: 'wait', value: '1000', label: '' }]);
    };

    const removeAction = (index: number) => {
        const newActions = [...actions];
        newActions.splice(index, 1);
        onChange(newActions);
    };

    const updateAction = (index: number, field: keyof Action, value: string) => {
        const newActions = [...actions];
        newActions[index] = { ...newActions[index], [field]: value };
        onChange(newActions);
    };

    const moveAction = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === actions.length - 1) return;

        const newActions = [...actions];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        [newActions[index], newActions[targetIndex]] = [newActions[targetIndex], newActions[index]];

        onChange(newActions);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Label>Script Actions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAction}>
                    <Plus className="mr-2 h-4 w-4" /> Add Action
                </Button>
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
                                        placeholder={
                                            action.type === 'wait' ? '1000' :
                                                action.type === 'click' ? '#submit-btn' :
                                                    action.type === 'type' ? '#search|query' : 'timeout(ms) or empty'
                                        }
                                        className="h-8"
                                    />
                                </div>
                            </div>
                            <div>
                                <Input
                                    value={action.label || ''}
                                    onChange={(e) => updateAction(index, 'label', e.target.value)}
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
                            >
                                <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === actions.length - 1}
                                onClick={() => moveAction(index, 'down')}
                            >
                                <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => removeAction(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
