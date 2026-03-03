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
        // The URL is displayed without the protocol prefix in our new design
        expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('displays the score and status correctly', () => {
        renderWithProviders(<UrlCard url={mockUrl} />);
        // Score is now a large number 100 with 'Score' label in circular indicator
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText(/score/i)).toBeInTheDocument();
        expect(screen.getByText('No issues')).toBeInTheDocument();
    });

    it('renders the scan button', () => {
        renderWithProviders(<UrlCard url={mockUrl} />);
        // The button text is now 'Run Scan'
        const scanBtn = screen.getByRole('button', { name: /run scan/i });
        expect(scanBtn).toBeInTheDocument();
    });

    it('renders accessibility features like aria-labels', () => {
        renderWithProviders(<UrlCard url={mockUrl} />);
        
        // Check for report link aria-label (more descriptive now)
        expect(screen.getByRole('link', { name: /view detailed accessibility report for example site. current score: 100/i })).toBeInTheDocument();
        
        // More actions button
        expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
    });
});
