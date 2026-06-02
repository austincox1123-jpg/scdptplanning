'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DashboardRow } from '@/types';
import { format, parseISO } from 'date-fns';

interface ChartPanelProps {
  rows: DashboardRow[];
}

export function ChartPanel({ rows }: ChartPanelProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-6 h-[400px] flex items-center justify-center">
        <p className="text-gray-400">No data to display. Adjust your filters or upload a file.</p>
      </div>
    );
  }

  const chartData = rows.map((r) => ({
    month: format(parseISO(r.month), 'MMM yy'),
    POS: r.posCases,
    Invoice: r.invoiceCases,
    Orders: r.orderCases,
    'Existing Forecast': r.existingForecast,
    'Stat Forecast': r.statForecast,
    'Customer POS Projection': r.customerPosProjection,
    Override: r.overrideVal,
  }));

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Sales & Forecast Trend</h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Line
            type="monotone"
            dataKey="POS"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="Invoice"
            stroke="#14b8a6"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="Orders"
            stroke="#9ca3af"
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />

          <Line
            type="monotone"
            dataKey="Existing Forecast"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls
          />

          <Line
            type="monotone"
            dataKey="Stat Forecast"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls
          />

          <Line
            type="monotone"
            dataKey="Customer POS Projection"
            stroke="#0891b2"
            strokeWidth={2}
            strokeDasharray="2 2"
            dot={false}
            connectNulls
          />

          <Line
            type="monotone"
            dataKey="Override"
            stroke="#22c55e"
            strokeWidth={0}
            dot={{ r: 5, fill: '#22c55e' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
