import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
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
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Trend History</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} onClick={handleClick}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11 }}
                                angle={-35}
                                textAnchor="end"
                                height={60}
                                interval={data.length > 10 ? Math.floor(data.length / 8) : 0}
                            />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                            <Tooltip
                                labelFormatter={(_label, payload) => {
                                    if (payload && payload.length > 0) {
                                        return payload[0].payload.fullDate;
                                    }
                                    return _label;
                                }}
                                cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
                            />
                            <Legend />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="issues"
                                stroke="#ef4444"
                                name="Issues"
                                strokeWidth={2}
                                dot={{ r: 3, cursor: 'pointer' }}
                                activeDot={{ r: 5, cursor: 'pointer' }}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="score"
                                stroke="#22c55e"
                                name="Score"
                                strokeWidth={2}
                                dot={{ r: 3, cursor: 'pointer' }}
                                activeDot={{ r: 5, cursor: 'pointer' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
