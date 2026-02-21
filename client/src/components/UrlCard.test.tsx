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
    frequency: 60,
    status: 'pass' as const,
    lastScore: 100,
    lastIssueCount: 0
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
        const scanBtn = screen.getByRole('button', { name: /scan/i });
        expect(scanBtn).toBeInTheDocument();
    });
});
