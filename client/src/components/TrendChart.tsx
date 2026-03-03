import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface HistoryItem {
    _id: string;
    timestamp: string;
    issuesCount: number;
    score?: number;
}

interface TrendChartProps {
    history: HistoryItem[];
    onSelectScan?: (scanId: string) => void;
}

export function TrendChart({ history, onSelectScan }: TrendChartProps) {
    if (!history || history.length === 0) return null;

    // Reverse history to show chronological order (oldest to newest)
    const data = [...history].reverse().map(item => ({
        id: item._id,
        date: new Date(item.timestamp).toLocaleString(undefined, {
            month: 'short', day: 'numeric'
        }),
        fullDate: new Date(item.timestamp).toLocaleString(),
        issues: item.issuesCount,
        score: item.score
    }));

    const handleClick = (state: unknown) => {
        const payloadData = state as { activePayload?: Array<{ payload: { id: string } }> };
        if (payloadData?.activePayload?.[0]?.payload?.id && onSelectScan) {
            onSelectScan(payloadData.activePayload[0].payload.id);
        }
    };

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" aspect={2.5} minWidth={0}>
                <AreaChart data={data} onClick={handleClick} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                        interval={data.length > 10 ? Math.floor(data.length / 5) : 0}
                    />
                    <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    />
                    <Tooltip
                        contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            padding: '12px'
                        }}
                        labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                        labelFormatter={(_label, payload) => {
                            if (payload && payload.length > 0) {
                                return payload[0].payload.fullDate;
                            }
                            return _label;
                        }}
                    />
                    <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="score"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorScore)"
                        name="Score"
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff', cursor: 'pointer' }}
                        activeDot={{ r: 6, strokeWidth: 0, cursor: 'pointer' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
