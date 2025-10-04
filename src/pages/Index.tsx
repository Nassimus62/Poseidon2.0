import React, { useState } from "react";
import { FileUpload } from "@/components/poseidon/FileUpload";
import { AnalysisControls } from "@/components/poseidon/AnalysisControls";
import { DataVisualization } from "@/components/poseidon/DataVisualization";
import { EventTimeline } from "@/components/poseidon/EventTimeline";
import { ExportControls } from "@/components/poseidon/ExportControls";
import { LocationInput } from "@/components/weather/LocationInput";
import { WeatherDisplay } from "@/components/weather/WeatherDisplay";
import { PoseidonAnalysisEngine } from "@/components/poseidon/AnalysisEngine";
import { WeatherService } from "@/services/weatherService";
import {
  FileData,
  ProcessedData,
  DetectedEvent,
  AnalysisConfig,
} from "@/types/poseidon";
import { LocationInfo, WeatherData } from "@/types/weather";
import { Waves, UserRound, Activity, CloudRain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(
    null
  );
  const [events, setEvents] = useState<DetectedEvent[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [config, setConfig] = useState<AnalysisConfig>({
    tideRemovalMethod: "lowpass",
    extremeThreshold: 0.3,
    confidenceThreshold: "Medium",
  });

  const { toast } = useToast();

  const handleFileLoaded = (data: FileData) => {
    setFileData(data);
    setProcessedData(null);
    setEvents([]);
    setWeatherData(null);

    toast({
      title: "File Loaded Successfully",
      description: `${data.filename} loaded with ${data.data.length} data points`,
    });
  };

  const handleLocationSet = async (loc: LocationInfo) => {
    setLocation(loc);
    toast({
      title: "Location Set",
      description: `Coordinates: ${loc.latitude.toFixed(
        4
      )}°, ${loc.longitude.toFixed(4)}°`,
    });

    // Auto-fetch weather if we have file data
    if (fileData?.data && fileData.data.length > 0) {
      await fetchWeather(loc);
    }
  };

  const fetchWeather = async (loc: LocationInfo) => {
    if (!fileData?.data || fileData.data.length === 0) return;

    setIsFetchingWeather(true);
    try {
      const startDate = fileData.data[0].timestamp;
      const endDate = fileData.data[fileData.data.length - 1].timestamp;

      const weather = await WeatherService.fetchHistoricalWeather(
        loc.latitude,
        loc.longitude,
        startDate,
        endDate
      );

      // Interpolate to 1-minute intervals matching sea level data
      const timestamps = fileData.data.map((d) => d.timestamp);
      const interpolatedWeather = WeatherService.interpolateToOneMinute(
        weather.data,
        timestamps
      );

      setWeatherData({
        location: weather.location,
        data: interpolatedWeather,
      });

      toast({
        title: "Weather Data Fetched",
        description: `Retrieved and interpolated weather data for ${interpolatedWeather.length} time points`,
      });
    } catch (error) {
      toast({
        title: "Weather Fetch Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to fetch weather data",
        variant: "destructive",
      });
    } finally {
      setIsFetchingWeather(false);
    }
  };

  const runAnalysis = async () => {
    if (!fileData?.data) return;

    setIsAnalyzing(true);

    try {
      const engine = new PoseidonAnalysisEngine(fileData.data, config);
      const results = await engine.runFullAnalysis();

      setProcessedData(results.processedData);
      setEvents(results.events);

      toast({
        title: "Analysis Complete",
        description: `Detected ${results.events.length} events`,
      });

      // Fetch weather if location is set
      if (location) {
        await fetchWeather(location);
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen wave-pattern p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2 flex items-center justify-center gap-3">
            <Waves className="w-10 h-10" />
            Poseidon
          </h1>
          <p className="text-muted-foreground">
            Advanced Oceanographic Analysis Tool
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Upload & Controls */}
          <div className="space-y-6">
            <FileUpload onFileLoaded={handleFileLoaded} />
            <LocationInput
              onLocationSet={handleLocationSet}
              disabled={isFetchingWeather}
            />
            <AnalysisControls
              config={config}
              onConfigChange={setConfig}
              onRunAnalysis={runAnalysis}
              isAnalyzing={isAnalyzing}
              hasData={!!fileData}
            />
          </div>

          {/* Middle & Right Columns: Results */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="sea-level" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sea-level">
                  <Waves className="w-4 h-4 mr-2" />
                  Sea Level
                </TabsTrigger>
                <TabsTrigger value="weather">
                  <CloudRain className="w-4 h-4 mr-2" />
                  Weather
                </TabsTrigger>
                <TabsTrigger value="events">
                  <Activity className="w-4 h-4 mr-2" />
                  Events
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sea-level" className="space-y-6">
                <DataVisualization
                  data={processedData}
                  events={events}
                  showOriginal={true}
                  showDetrended={true}
                  showResiduals={true}
                />
              </TabsContent>

              <TabsContent value="weather" className="space-y-6">
                {weatherData ? (
                  <WeatherDisplay weatherData={weatherData} />
                ) : (
                  <div className="text-center p-12 text-muted-foreground">
                    Set location and run analysis to view weather data
                  </div>
                )}
              </TabsContent>

              <TabsContent value="events" className="space-y-6">
                <EventTimeline events={events} />
                <ExportControls
                  fileData={fileData}
                  processedData={processedData}
                  events={events}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      {/* Footer Info */}
      <footer className="mt-16 text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-4">
          <UserRound className="w-5 h-5" />
          <span className="font-medium">Created by "Mechat Nassim"</span>
        </div>
        <p className="text-sm">
          Poseidon uses spectral analysis, envelope detection, and machine
          learning techniques to identify tidal phases, storm surges, seiches,
          and wave patterns in sea-level data.
        </p>
      </footer>
    </div>
  );
};

export default Index;
