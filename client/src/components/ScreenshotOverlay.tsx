import { useRef, useState, useCallback, useEffect } from 'react';

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface OverlayIssue {
    code: string;
    message: string;
    selector: string;
    type: string;
    boundingBox?: BoundingBox | null;
}

interface ScreenshotOverlayProps {
    screenshot: string;
    issues: OverlayIssue[];
    viewport?: { width: number; height: number };
    selectedIssueIndex: number | null;
    onSelectIssue: (index: number | null) => void;
}

const TYPE_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
    error: { fill: 'rgba(239, 68, 68, 0.15)', stroke: 'rgba(239, 68, 68, 0.8)', label: 'Error' },
    warning: { fill: 'rgba(245, 158, 11, 0.15)', stroke: 'rgba(245, 158, 11, 0.8)', label: 'Warning' },
    notice: { fill: 'rgba(59, 130, 246, 0.15)', stroke: 'rgba(59, 130, 246, 0.8)', label: 'Notice' },
};

export function ScreenshotOverlay({
    screenshot,
    issues,
    viewport,
    selectedIssueIndex,
    onSelectIssue,
}: ScreenshotOverlayProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [scale, setScale] = useState(1);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; containerWidth: number } | null>(null);

    const [visible, setVisible] = useState(true);

    // Issues that have a bounding box
    const overlayIssues = issues
        .map((issue, originalIndex) => ({ ...issue, originalIndex }))
        .filter((issue) => issue.boundingBox);

    const updateScale = useCallback(() => {
        if (!imgRef.current || !viewport) return;
        const displayedWidth = imgRef.current.clientWidth;
        setScale(displayedWidth / viewport.width);
    }, [viewport]);

    useEffect(() => {
        if (!imgLoaded) return;
        updateScale();
        const observer = new ResizeObserver(updateScale);
        if (imgRef.current) observer.observe(imgRef.current);
        return () => observer.disconnect();
    }, [imgLoaded, updateScale]);

    const handleBoxClick = (originalIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectIssue(selectedIssueIndex === originalIndex ? null : originalIndex);
    };

    const handleBoxMouseEnter = (originalIndex: number, e: React.MouseEvent) => {
        setHoveredIndex(originalIndex);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, containerWidth: rect.width });
        }
    };

    const handleBoxMouseLeave = () => {
        setHoveredIndex(null);
        setTooltipPos(null);
    };

    const handleBackdropClick = () => {
        onSelectIssue(null);
    };

    // No overlay issues or no viewport → just show the image
    if (!viewport || overlayIssues.length === 0) {
        return (
            <div className="border rounded overflow-hidden">
                <img src={screenshot} alt="Accessibility scan screenshot" className="w-full h-auto" />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="border rounded overflow-hidden relative cursor-crosshair group"
            onClick={handleBackdropClick}
        >
            <img
                ref={imgRef}
                src={screenshot}
                alt="Accessibility scan screenshot with issue overlays"
                className="w-full h-auto block"
                onLoad={() => setImgLoaded(true)}
            />

            {imgLoaded && visible && overlayIssues.map((issue) => {
                const bb = issue.boundingBox!;
                const isSelected = selectedIssueIndex === issue.originalIndex;
                const isHovered = hoveredIndex === issue.originalIndex;
                const colors = TYPE_COLORS[issue.type] || TYPE_COLORS.notice;

                return (
                    <div
                        key={issue.originalIndex}
                        onClick={(e) => handleBoxClick(issue.originalIndex, e)}
                        onMouseEnter={(e) => handleBoxMouseEnter(issue.originalIndex, e)}
                        onMouseLeave={handleBoxMouseLeave}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleBoxClick(issue.originalIndex, e as unknown as React.MouseEvent)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${colors.label}: ${issue.code}`}
                        aria-pressed={isSelected}
                        className="absolute transition-all duration-150"
                        style={{
                            left: bb.x * scale,
                            top: bb.y * scale,
                            width: bb.width * scale,
                            height: bb.height * scale,
                            backgroundColor: isSelected || isHovered ? colors.fill : 'transparent',
                            border: `2px solid ${colors.stroke}`,
                            borderRadius: 2,
                            boxShadow: isSelected ? `0 0 0 2px ${colors.stroke}, 0 0 12px ${colors.fill}` : 'none',
                            zIndex: isSelected ? 20 : isHovered ? 10 : 1,
                            cursor: 'pointer',
                        }}
                    />
                );
            })}

            {/* Toggle Visibility Button */}
            <button
                onClick={(e) => { e.stopPropagation(); setVisible(!visible); }}
                className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-1.5 rounded-md border shadow-sm hover:bg-background/90 transition-colors z-30"
                aria-label={visible ? "Hide accessibility overlays" : "Show accessibility overlays"}
                title={visible ? "Hide overlays" : "Show overlays"}
            >
                {visible ? (
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                ) : (
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                )}
            </button>

            {/* Tooltip */}
            {visible && hoveredIndex !== null && tooltipPos && (
                <div
                    className="absolute pointer-events-none z-50 bg-popover text-popover-foreground border shadow-lg rounded-md px-3 py-2 text-xs max-w-[300px]"
                    style={{
                        left: Math.min(tooltipPos.x + 12, tooltipPos.containerWidth - 200),
                        top: tooltipPos.y + 12,
                    }}
                >
                    <div className="font-semibold mb-1">{issues[hoveredIndex]?.code}</div>
                    <div className="text-muted-foreground line-clamp-2">{issues[hoveredIndex]?.message}</div>
                </div>
            )}

            {/* Legend */}
            {visible && (
                <div className="absolute bottom-2 right-2 flex gap-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-[10px] border shadow-sm z-30">
                    {Object.entries(TYPE_COLORS).map(([type, c]) => (
                        <div key={type} className="flex items-center gap-1">
                            <span className="inline-block w-2.5 h-2.5 rounded-sm border" style={{ backgroundColor: c.fill, borderColor: c.stroke }} />
                            <span className="capitalize">{c.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
