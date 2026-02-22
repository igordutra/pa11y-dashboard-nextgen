import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UrlCard } from './UrlCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock the API client
vi.mock('../lib/api', () => ({
    default: {
        post: vi.fn(),
        delete: vi.fn()
    }
}));

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
});

const renderWithProviders = (ui: React.ReactElement) => {
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                {ui}
            </MemoryRouter>
        </QueryClientProvider>
    );
};

const mockUrl = {
    _id: '123',
    url: 'https://example.com',
    name: 'Example Site',
    schedule: '0 * * * *',
    status: 'active' as const,
    lastScore: 100,
    lastIssueCount: 0,
    actions: []
};

describe('UrlCard Component', () => {
    it('renders the URL name and the parsed url string', () => {
        renderWithProviders(<UrlCard url={mockUrl} />);
        expect(screen.getByText('Example Site')).toBeInTheDocument();
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });

    it('displays the score and status correctly', () => {
        renderWithProviders(<UrlCard url={mockUrl} />);
        expect(screen.getByText('Score: 100')).toBeInTheDocument();
        expect(screen.getByText('Pass')).toBeInTheDocument();
    });

    it('renders the scan button', () => {
        renderWithProviders(<UrlCard url={mockUrl} />);
        // Use a more specific name that matches our new aria-label
        const scanBtn = screen.getByRole('button', { name: /run new scan/i });
        expect(scanBtn).toBeInTheDocument();
    });

    it('renders accessibility features like aria-labels', () => {
        renderWithProviders(<UrlCard url={mockUrl} />);
        
        // Check for delete button aria-label
        expect(screen.getByRole('button', { name: /delete example site/i })).toBeInTheDocument();
        
        // Check for history button aria-label
        expect(screen.getByRole('button', { name: /view scan history for example site/i })).toBeInTheDocument();
        
        // Check for edit button aria-label
        expect(screen.getByRole('button', { name: /edit configuration for https:\/\/example.com/i })).toBeInTheDocument();
    });
});
