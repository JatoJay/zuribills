import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell,
} from 'recharts';

type PieDatum = {
    name: string;
    value: number;
    color: string;
    [key: string]: string | number;
};

type RevenueDatum = {
    name: string;
    revenue: number;
    invoiced: number;
    count: number;
    [key: string]: string | number;
};

export const RevenueBarChart: React.FC<{ data: RevenueDatum[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.1} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(val) => `${val / 1000}k`} />
            <Tooltip
                cursor={{ fill: 'var(--surface)' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
            />
            <Bar dataKey="invoiced" name="Total Invoiced" fill="var(--text-muted)" radius={[4, 4, 0, 0]} barSize={20} opacity={0.3} />
            <Bar dataKey="revenue" name="Revenue Collected" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
    </ResponsiveContainer>
);

export const StatusPieChart: React.FC<{ data: PieDatum[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <PieChart>
            <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
            >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
        </PieChart>
    </ResponsiveContainer>
);

const DashboardCharts = { RevenueBarChart, StatusPieChart };
export default DashboardCharts;
