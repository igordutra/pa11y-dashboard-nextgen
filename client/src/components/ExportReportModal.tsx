import { useState } from 'react';
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
    const [isPreviewing, setIsPreviewing] = useState(false);

    const handleDownload = () => {
        const html = generateHtmlReport(url, scan);
        const blob = new Blob([html], { type: 'text/html' });
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlObj;
        a.download = `accessibility-report-${url.name || 'site'}-${new Date(scan.timestamp).toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(urlObj);
    };

    const reportHtml = generateHtmlReport(url, scan);

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

                <div className="flex-1 overflow-hidden border rounded-md my-4">
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
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleDownload}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Download HTML Report
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
