import { useState, useRef } from 'react';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface Issue {
    type: string;
    code: string;
    message: string;
    selector: string;
    context: string;
    position?: {
        left: number; // percentage
        top: number; // percentage
        width: number; // percentage
        height: number; // percentage
    };
}

interface InteractiveScreenshotProps {
    screenshotSrc: string;
    issues: Issue[];
    stepName?: string;
}

export function InteractiveScreenshot({ screenshotSrc, issues, stepName }: InteractiveScreenshotProps) {
    const [showAllOverlays, setShowAllOverlays] = useState(false);
    const [hoveredIssueIndex, setHoveredIssueIndex] = useState<number | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Filter issues that actually have position data
    const issuesWithPosition = issues.map((issue, index) => ({ ...issue, originalIndex: index }))
        .filter(issue => issue.position);

    // If no issues have positions, we just render the raw image
    const hasPositionData = issuesWithPosition.length > 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Screenshot {stepName && `- ${stepName}`}</h3>
                {hasPositionData && (
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="show-overlays" className="text-sm text-muted-foreground cursor-pointer">
                            Show All Overlays
                        </Label>
                        <Switch
                            id="show-overlays"
                            checked={showAllOverlays}
                            onCheckedChange={setShowAllOverlays}
                        />
                    </div>
                )}
            </div>

            <div className="relative border rounded overflow-hidden bg-muted flex items-center justify-center min-h-[300px]">
                {screenshotSrc ? (
                    <div className="relative w-full h-auto max-w-full">
                        <img
                            ref={imgRef}
                            src={screenshotSrc.startsWith('data:') ? screenshotSrc : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${screenshotSrc}`}
                            alt="Page Screenshot"
                            className="w-full h-auto block"
                        />

                        {/* Overlays */}
                        {hasPositionData && issuesWithPosition.map((issue, idx) => {
                            if (!issue.position) return null;

                            const isHovered = hoveredIssueIndex === issue.originalIndex;
                            const isVisible = showAllOverlays || isHovered;

                            // Determine color based on type
                            const colorClass = issue.type === 'error'
                                ? 'border-red-500 bg-red-500/20'
                                : issue.type === 'warning'
                                    ? 'border-yellow-500 bg-yellow-500/20'
                                    : 'border-blue-500 bg-blue-500/20';

                            const badgeColor = issue.type === 'error'
                                ? 'destructive'
                                : issue.type === 'warning'
                                    ? 'warning'
                                    : 'default';

                            return (
                                <div
                                    key={`overlay-${idx}`}
                                    className={`absolute border-2 transition-all duration-200 cursor-help ${colorClass} ${isVisible ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                    style={{
                                        left: `${issue.position.left}%`,
                                        top: `${issue.position.top}%`,
                                        width: `${Math.max(issue.position.width, 2)}%`, // Ensure minimum visible width
                                        height: `${Math.max(issue.position.height, 2)}%`, // Ensure minimum visible height
                                    }}
                                    onMouseEnter={() => setHoveredIssueIndex(issue.originalIndex)}
                                    onMouseLeave={() => setHoveredIssueIndex(null)}
                                >
                                    {isVisible && (
                                        <div className="absolute -top-8 left-0 bg-background/90 backdrop-blur-sm border shadow-sm p-1 rounded whitespace-nowrap z-20 pointer-events-none transform -translate-x-1/2 ml-[50%]">
                                            <Badge variant={badgeColor as 'default' | 'destructive' | 'warning'} className="mr-2 text-[10px] h-4 px-1">{issue.type}</Badge>
                                            <span className="text-xs font-mono">{issue.code}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground w-full">
                        No screenshot available
                    </div>
                )}
            </div>

            {/* Interactive Issue List specifically for highlighting */}
            {hasPositionData && (
                <div className="text-sm text-muted-foreground mt-2">
                    <p>Issues with locations are highlighted on the screenshot.</p>
                </div>
            )}
        </div>
    );
}
