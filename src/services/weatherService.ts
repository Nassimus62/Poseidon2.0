import { WeatherData, WeatherDataPoint } from "@/types/weather";

/**
 * Fetches historical weather data from Open-Meteo API (100% free, no API key)
 */
export class WeatherService {
  private static readonly BASE_URL = "https://archive-api.open-meteo.com/v1/archive";

  /**
   * Fetch historical weather data for a specific location and time period
   */
  static async fetchHistoricalWeather(
    latitude: number,
    longitude: number,
    startDate: Date,
    endDate: Date
  ): Promise<WeatherData> {
    try {
      // Format dates for API (YYYY-MM-DD)
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
      };

      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        hourly: [
          'temperature_2m',
          'windspeed_10m',
          'winddirection_10m',
          'surface_pressure',
          'relativehumidity_2m'
        ].join(','),
        timezone: 'auto'
      });

      const response = await fetch(`${this.BASE_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();

      // Parse the response into our WeatherDataPoint format
      const weatherPoints: WeatherDataPoint[] = [];
      
      if (data.hourly) {
        const times = data.hourly.time;
        const temps = data.hourly.temperature_2m;
        const windSpeeds = data.hourly.windspeed_10m;
        const windDirs = data.hourly.winddirection_10m;
        const pressures = data.hourly.surface_pressure;
        const humidities = data.hourly.relativehumidity_2m;

        for (let i = 0; i < times.length; i++) {
          weatherPoints.push({
            timestamp: new Date(times[i]),
            temperature: temps[i] ?? 0,
            windSpeed: windSpeeds[i] ?? 0,
            windDirection: windDirs[i] ?? 0,
            pressure: pressures[i] ?? 0,
            humidity: humidities[i] ?? 0,
          });
        }
      }

      return {
        location: { latitude, longitude },
        data: weatherPoints
      };
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      throw new Error(
        `Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Interpolate hourly weather data to 1-minute intervals
   */
  static interpolateToOneMinute(
    weatherData: WeatherDataPoint[],
    targetTimestamps: Date[]
  ): WeatherDataPoint[] {
    if (weatherData.length === 0 || targetTimestamps.length === 0) {
      return [];
    }

    // Sort both arrays by timestamp
    const sortedWeather = [...weatherData].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    const sortedTargets = [...targetTimestamps].sort((a, b) => 
      a.getTime() - b.getTime()
    );

    const interpolated: WeatherDataPoint[] = [];

    for (const targetTime of sortedTargets) {
      const targetMs = targetTime.getTime();

      // Find the two closest weather data points
      let beforeIndex = -1;
      let afterIndex = -1;

      for (let i = 0; i < sortedWeather.length; i++) {
        const weatherMs = sortedWeather[i].timestamp.getTime();
        
        if (weatherMs <= targetMs) {
          beforeIndex = i;
        }
        
        if (weatherMs >= targetMs && afterIndex === -1) {
          afterIndex = i;
          break;
        }
      }

      // Handle edge cases
      if (beforeIndex === -1) {
        // Target is before all weather data, use first point
        interpolated.push({
          ...sortedWeather[0],
          timestamp: targetTime
        });
        continue;
      }

      if (afterIndex === -1) {
        // Target is after all weather data, use last point
        interpolated.push({
          ...sortedWeather[sortedWeather.length - 1],
          timestamp: targetTime
        });
        continue;
      }

      // If we have exact match
      if (beforeIndex === afterIndex) {
        interpolated.push({
          ...sortedWeather[beforeIndex],
          timestamp: targetTime
        });
        continue;
      }

      // Linear interpolation
      const before = sortedWeather[beforeIndex];
      const after = sortedWeather[afterIndex];
      
      const beforeMs = before.timestamp.getTime();
      const afterMs = after.timestamp.getTime();
      const ratio = (targetMs - beforeMs) / (afterMs - beforeMs);

      interpolated.push({
        timestamp: targetTime,
        temperature: this.lerp(before.temperature, after.temperature, ratio),
        windSpeed: this.lerp(before.windSpeed, after.windSpeed, ratio),
        windDirection: this.lerpAngle(before.windDirection, after.windDirection, ratio),
        pressure: this.lerp(before.pressure, after.pressure, ratio),
        humidity: this.lerp(before.humidity, after.humidity, ratio),
      });
    }

    return interpolated;
  }

  /**
   * Linear interpolation
   */
  private static lerp(start: number, end: number, ratio: number): number {
    return start + (end - start) * ratio;
  }

  /**
   * Interpolate angles (for wind direction) considering circular nature (0° = 360°)
   */
  private static lerpAngle(start: number, end: number, ratio: number): number {
    const diff = ((end - start + 180) % 360) - 180;
    return (start + diff * ratio + 360) % 360;
  }
}
