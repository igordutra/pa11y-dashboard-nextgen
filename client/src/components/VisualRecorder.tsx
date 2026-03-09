import { useEffect, useState } from 'react';
import { Action } from '../types';
import { AlertTriangle, Info } from 'lucide-react';

interface VisualRecorderProps {
    targetUrl: string;
    onActionRecorded: (action: Action) => void;
}

export function VisualRecorder({ targetUrl, onActionRecorded }: VisualRecorderProps) {
    const [proxyError, setProxyError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const data = event.data;
            if (data && data.type === 'pa11y_action') {
                if (data.action === 'click') {
                    onActionRecorded({
                        type: 'click',
                        value: data.selector,
                        label: `Click on ${data.selector.split(' > ').pop()}`
                    });
                } else if (data.action === 'type') {
                    onActionRecorded({
                        type: 'type',
                        value: `${data.selector}|${data.value}`,
                        label: `Type into ${data.selector.split(' > ').pop()}`
                    });
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onActionRecorded]);

    const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;

    return (
        <div className="flex flex-col h-full bg-slate-50 border rounded-lg overflow-hidden">
            <div className="bg-slate-100 p-2 border-b text-xs flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span>Interact with the site below to record clicks and typing.</span>
                </div>
                <div className="text-muted-foreground truncate max-w-[200px]" title={targetUrl}>
                    {targetUrl}
                </div>
            </div>

            {proxyError ? (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full text-slate-500">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                    <p className="font-semibold text-slate-700">Failed to load preview</p>
                    <p className="text-sm mt-1 max-w-sm">
                        This site might be blocking proxy requests or using advanced security measures. 
                        You may need to write your script manually.
                    </p>
                </div>
            ) : (
                <div className="relative flex-1 min-h-[400px]">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
                        </div>
                    )}
                    <iframe
                        src={proxyUrl}
                        className="w-full h-full border-none bg-white"
                        sandbox="allow-same-origin allow-scripts allow-forms"
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setIsLoading(false);
                            setProxyError(true);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
