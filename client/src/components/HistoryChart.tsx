import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface HistoryChartProps {
    data: {
        timestamp: string;
        issuesCount: number;
    }[];
}

export function HistoryChart({ data }: HistoryChartProps) {
    const formattedData = data.map((item) => ({
        ...item,
        date: format(new Date(item.timestamp), 'MM/dd HH:mm'),
    })).reverse(); // Recharts renders left-to-right, so we need oldest first if API returns newest first

    return (
        <div className="h-[300px] w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart
                    data={formattedData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                        type="monotone"
                        dataKey="issuesCount"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                        name="Issues"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
