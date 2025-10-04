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
  Legend,
} from 'recharts';
import { CloudRain, Wind, Gauge, Thermometer } from 'lucide-react';
import { WeatherData } from '@/types/weather';

interface WeatherDisplayProps {
  weatherData: WeatherData | null;
}

export const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weatherData }) => {
  const chartData = useMemo(() => {
    if (!weatherData?.data) return [];

    return weatherData.data.map((point) => ({
      timestamp: point.timestamp.getTime(),
      timestampStr: point.timestamp.toLocaleString(),
      temperature: point.temperature,
      windSpeed: point.windSpeed,
      windDirection: point.windDirection,
      pressure: point.pressure,
      humidity: point.humidity,
    }));
  }, [weatherData]);

  const formatXAxis = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = useMemo(() => {
    if (!weatherData?.data || weatherData.data.length === 0) return null;

    const temps = weatherData.data.map(d => d.temperature);
    const winds = weatherData.data.map(d => d.windSpeed);
    const pressures = weatherData.data.map(d => d.pressure);

    return {
      avgTemp: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
      maxTemp: Math.max(...temps).toFixed(1),
      minTemp: Math.min(...temps).toFixed(1),
      avgWind: (winds.reduce((a, b) => a + b, 0) / winds.length).toFixed(1),
      maxWind: Math.max(...winds).toFixed(1),
      avgPressure: (pressures.reduce((a, b) => a + b, 0) / pressures.length).toFixed(1),
    };
  }, [weatherData]);

  if (!weatherData || !stats) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Weather Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              Temperature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTemp}°C</div>
            <p className="text-xs text-muted-foreground mt-1">
              Range: {stats.minTemp}°C - {stats.maxTemp}°C
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wind className="w-4 h-4" />
              Wind Speed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgWind} km/h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Max: {stats.maxWind} km/h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Pressure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPressure} hPa</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average atmospheric pressure
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CloudRain className="w-4 h-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono">
              {weatherData.location.latitude.toFixed(4)}°,
            </div>
            <div className="text-sm font-mono">
              {weatherData.location.longitude.toFixed(4)}°
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Temperature Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Temperature Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: '°C', position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                }}
                labelFormatter={(value) => new Date(value).toLocaleString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#ef4444"
                name="Temperature (°C)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Wind and Pressure Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Wind Speed</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: 'km/h', position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="windSpeed"
                  stroke="#3b82f6"
                  name="Wind Speed (km/h)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atmospheric Pressure</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: 'hPa', position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pressure"
                  stroke="#8b5cf6"
                  name="Pressure (hPa)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
