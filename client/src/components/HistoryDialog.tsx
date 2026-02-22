import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { LineChart as ChartIcon } from 'lucide-react';
import { HistoryChart } from './HistoryChart';

interface HistoryDialogProps {
    urlId: string;
    urlName: string;
}

export function HistoryDialog({ urlId, urlName }: HistoryDialogProps) {
    const { data: history, isLoading } = useQuery({
        queryKey: ['history', urlId],
        queryFn: async () => {
            const res = await api.get(`/api/urls/${urlId}/history`);
            return res.data;
        },
        enabled: !!urlId, // Only fetch when urlId is present (it always is here)
    });

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" aria-label={`View scan history for ${urlName}`}>
                    <ChartIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                    History
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Scan History: {urlName}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    {isLoading ? (
                        <div>Loading history...</div>
                    ) : history && history.length > 0 ? (
                        <HistoryChart data={history} />
                    ) : (
                        <div>No scan history available.</div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
