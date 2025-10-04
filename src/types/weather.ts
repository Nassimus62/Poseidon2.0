export interface WeatherDataPoint {
  timestamp: Date;
  temperature: number; // °C
  windSpeed: number; // km/h
  windDirection: number; // degrees
  pressure: number; // hPa
  humidity: number; // %
}

export interface WeatherData {
  location: {
    latitude: number;
    longitude: number;
  };
  data: WeatherDataPoint[];
}

export interface LocationInfo {
  latitude: number;
  longitude: number;
}
