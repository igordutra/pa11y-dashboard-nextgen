import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Scan, Url } from '../types';
import { generateHtmlReport } from '../lib/reportGenerator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { FileDown, Eye, Loader2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface ExportReportModalProps {
    url: Url;
    scan: Scan;
}

export function ExportReportModal({ url, scan }: ExportReportModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Fetch full scan details if the passed scan object is simplified (e.g. from history list)
    const { data: fullScan, isLoading } = useQuery({
        queryKey: ['scan-details', scan._id],
        queryFn: async () => (await api.get(`/api/scans/${scan._id}`)).data,
        enabled: isOpen && (!scan.issues || scan.issues.length === 0)
    });

    const activeScan = fullScan || scan;

    const handleDownload = () => {
        const html = generateHtmlReport(url, activeScan);
        const blob = new Blob([html], { type: 'text/html' });
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlObj;
        a.download = `accessibility-report-${url.name || 'site'}-${new Date(activeScan.timestamp).toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(urlObj);
    };

    const reportHtml = generateHtmlReport(url, activeScan);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <FileDown className="mr-2 h-4 w-4" aria-hidden="true" />
                    Export Report
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Export Accessibility Report</DialogTitle>
                    <DialogDescription>
                        Generate a standalone HTML report following the WCAG-EM structure.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden border rounded-md my-4 min-h-[400px]">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p>Loading full scan data...</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-muted p-2 border-b flex justify-between items-center">
                                <span className="text-xs font-medium">Report Preview</span>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-xs"
                                    onClick={() => {
                                        const win = window.open('', '_blank');
                                        if (win) {
                                            win.document.write(reportHtml);
                                            win.document.close();
                                        }
                                    }}
                                >
                                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                                    Open in New Tab
                                </Button>
                            </div>
                            <ScrollArea className="h-[400px] w-full bg-white">
                                <div className="p-4 origin-top scale-[0.85] w-[117%]">
                                    <iframe 
                                        srcDoc={reportHtml} 
                                        title="Report Preview" 
                                        className="w-full h-[1000px] border-none"
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            </ScrollArea>
                        </>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleDownload} disabled={isLoading}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Download HTML Report
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
