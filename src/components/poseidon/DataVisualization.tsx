import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Legend
} from 'recharts';
import { TrendingUp, Waves, Activity } from 'lucide-react';
import { ProcessedData, DetectedEvent } from '@/types/poseidon';

interface DataVisualizationProps {
  data: ProcessedData | null;
  events: DetectedEvent[];
  showOriginal: boolean;
  showDetrended: boolean;
  showResiduals: boolean;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({
  data,
  events,
  showOriginal = true,
  showDetrended = true,
  showResiduals = true
}) => {
  const chartData = useMemo(() => {
    if (!data) return [];

    return data.original.map((point, index) => ({
      timestamp: point.timestamp.getTime(),
      timestampStr: point.timestamp.toLocaleTimeString(),
      original: point.seaLevel,
      detrended: data.detrended[index]?.seaLevel || 0,
      residuals: data.residuals[index]?.seaLevel || 0,
      tidal: data.tidal[index]?.seaLevel || 0,
    }));
  }, [data]);

  const eventMarkers = useMemo(() => {
    return events.map(event => ({
      timestamp: event.startTime.getTime(),
      type: event.type,
      confidence: event.confidence,
      label: event.label,
      y: 0 // Will be positioned dynamically
    }));
  }, [events]);

  const formatXAxis = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const timestamp = new Date(label);
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">
            {timestamp.toLocaleString()}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.dataKey}: {entry.value.toFixed(2)} m
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const EventTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const event = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-xs">
          <p className="font-medium text-primary">{event.label}</p>
          <p className="text-sm text-muted-foreground">
            Confidence: {event.confidence}
          </p>
          <p className="text-xs mt-1">
            {new Date(event.timestamp).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data) {
    return (
      <Card className="ocean-shadow">
        <CardContent className="p-8 text-center">
          <Waves className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Upload data and run analysis to view visualizations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Time Series Chart */}
      <Card className="ocean-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Sea Level Time Series
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis
                  label={{ value: 'Sea Level (m)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {showOriginal && (
                  <Line
                    type="monotone"
                    dataKey="original"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Original Data"
                  />
                )}

                {showDetrended && (
                  <Line
                    type="monotone"
                    dataKey="detrended"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={1.5}
                    dot={false}
                    name="Detrended"
                  />
                )}

                {showResiduals && (
                  <Line
                    type="monotone"
                    dataKey="residuals"
                    stroke="hsl(var(--accent))"
                    strokeWidth={1}
                    dot={false}
                    name="Residuals"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Event Markers Chart */}
      {events.length > 0 && (
        <Card className="ocean-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Detected Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  data={eventMarkers}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatXAxis}
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                  />
                  <YAxis hide />
                  <Tooltip content={<EventTooltip />} />

                  <Scatter
                    dataKey="y"
                    fill="hsl(var(--primary))"
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      const colors = {
                        'High': 'hsl(var(--success))',
                        'Medium': 'hsl(var(--warning))',
                        'Low': 'hsl(var(--destructive))'
                      };
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={colors[payload.confidence as keyof typeof colors]}
                          stroke="white"
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};