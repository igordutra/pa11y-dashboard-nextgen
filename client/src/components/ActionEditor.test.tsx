import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActionEditor } from './ActionEditor';
import { CronEditor } from './CronEditor';
import { Action } from '../types';

describe('ActionEditor Component', () => {
    const mockActions: Action[] = [
        { type: 'wait', value: '1000', label: 'Wait 1s' }
    ];
    const onChange = vi.fn();

    it('renders with accessibility labels', () => {
        render(<ActionEditor actions={mockActions} onChange={onChange} />);
        
        // Check for the main label
        expect(screen.getByText('Script Actions')).toBeInTheDocument();
        
        // Check for the add button
        expect(screen.getByRole('button', { name: /add action/i })).toBeInTheDocument();
        
        // Check for row-specific accessibility labels
        expect(screen.getByLabelText('Action 1 type')).toBeInTheDocument();
        expect(screen.getByLabelText('Action 1 value')).toBeInTheDocument();
        expect(screen.getByLabelText('Action 1 optional label')).toBeInTheDocument();
        
        // Check for control buttons with labels
        expect(screen.getByLabelText(/remove action 1/i)).toBeInTheDocument();
    });

    it('calls onChange when adding an action', () => {
        render(<ActionEditor actions={[]} onChange={onChange} />);
        const addBtn = screen.getByRole('button', { name: /add action/i });
        fireEvent.click(addBtn);
        expect(onChange).toHaveBeenCalledWith([{ type: 'wait', value: '1000', label: '' }]);
    });

    it('enables move buttons correctly', () => {
        const twoActions: Action[] = [
            { type: 'wait', value: '1000' },
            { type: 'click', value: '#btn' }
        ];
        render(<ActionEditor actions={twoActions} onChange={onChange} />);
        
        const moveUpBtns = screen.getAllByLabelText(/move action up/i);
        const moveDownBtns = screen.getAllByLabelText(/move action down/i);
        
        // First action cannot move up
        expect(moveUpBtns[0]).toBeDisabled();
        // First action can move down
        expect(moveDownBtns[0]).not.toBeDisabled();
        
        // Second action can move up
        expect(moveUpBtns[1]).not.toBeDisabled();
        // Second action cannot move down
        expect(moveDownBtns[1]).toBeDisabled();
    });
});

describe('CronEditor Component', () => {
    const onChange = vi.fn();

    it('focuses input when Custom button is clicked', () => {
        render(<CronEditor value="0 * * * *" onChange={onChange} />);
        const customBtn = screen.getByRole('button', { name: /custom/i });
        const input = screen.getByLabelText('Cron expression');
        
        fireEvent.click(customBtn);
        expect(input).toHaveFocus();
    });

    it('shows human readable description for valid cron', () => {
        render(<CronEditor value="0 0 * * *" onChange={onChange} />);
        expect(screen.getByText((content) => content.includes('at 00:00'))).toBeInTheDocument();
    });

    it('shows error for invalid cron', () => {
        render(<CronEditor value="invalid" onChange={onChange} />);
        expect(screen.getByText(/invalid cron expression/i)).toBeInTheDocument();
        const input = screen.getByLabelText('Cron expression');
        expect(input).toHaveAttribute('aria-invalid', 'true');
    });
});
