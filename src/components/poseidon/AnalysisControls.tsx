import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Settings, Play, Waves } from "lucide-react";
import { AnalysisConfig } from "@/types/poseidon";

interface AnalysisControlsProps {
  config: AnalysisConfig;
  onConfigChange: (config: AnalysisConfig) => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  hasData: boolean;
}

export const AnalysisControls: React.FC<AnalysisControlsProps> = ({
  config,
  onConfigChange,
  onRunAnalysis,
  isAnalyzing,
  hasData,
}) => {
  const updateConfig = (updates: Partial<AnalysisConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <Card className="ocean-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Analysis Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tide Removal Method */}
        <div className="space-y-2">
          <Label htmlFor="tide-method">Tide Removal Method</Label>
          <Select
            value={config.tideRemovalMethod}
            onValueChange={(value: "harmonic" | "lowpass") =>
              updateConfig({ tideRemovalMethod: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lowpass">
                Low-pass Filter (Recommended)
              </SelectItem>
              <SelectItem value="harmonic">Harmonic Fit</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {config.tideRemovalMethod === "lowpass"
              ? "Uses moving-window polynomial fit to capture multi-hour tides"
              : "Fits harmonic components to model tidal variations"}
          </p>
        </div>

        <Separator />

        {/* Thresholds */}
        <div className="space-y-4">
          <h4 className="font-medium">Detection Thresholds</h4>

          <div className="space-y-2">
            <Label htmlFor="extreme-threshold">
              Extreme Level Threshold (m)
            </Label>
            <Input
              id="extreme-threshold"
              type="number"
              step="0.01"
              value={config.extremeThreshold}
              onChange={(e) =>
                updateConfig({
                  extremeThreshold: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="Enter threshold in m"
            />
            <p className="text-xs text-muted-foreground">
              Levels exceeding ±{config.extremeThreshold}m from mean will be
              flagged as extreme
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confidence-threshold">
              Minimum Confidence Level
            </Label>
            <Select
              value={config.confidenceThreshold}
              onValueChange={(value: "High" | "Medium" | "Low") =>
                updateConfig({ confidenceThreshold: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High Confidence Only</SelectItem>
                <SelectItem value="Medium">Medium & High Confidence</SelectItem>
                <SelectItem value="Low">All Confidence Levels</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Time Range Selection */}
        <div className="space-y-4">
          <h4 className="font-medium">Analysis Time Range</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={config.startTime?.toISOString().slice(0, 16) || ""}
                onChange={(e) =>
                  updateConfig({
                    startTime: e.target.value
                      ? new Date(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={config.endTime?.toISOString().slice(0, 16) || ""}
                onChange={(e) =>
                  updateConfig({
                    endTime: e.target.value
                      ? new Date(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Leave empty to analyze the entire dataset
          </p>
        </div>

        <Separator />

        {/* Analysis Controls */}
        <div className="space-y-4">
          <Button
            onClick={onRunAnalysis}
            disabled={!hasData || isAnalyzing}
            className="w-full ocean-gradient text-primary-foreground"
            size="lg"
          >
            <Play className="w-4 h-4 mr-2" />
            {isAnalyzing ? "Analyzing Data..." : "Run Analysis"}
          </Button>

          {!hasData && (
            <p className="text-sm text-muted-foreground text-center">
              Upload a data file to enable analysis
            </p>
          )}
        </div>

        {/* Analysis Info */}
        <div className="p-4 bg-ocean-mist rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Waves className="w-4 h-4 text-ocean-surface" />
            <h4 className="font-medium">Detection Capabilities</h4>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Tidal phases (rising, falling, high, low tide)</li>
            <li>• Storm surge anomalies and peak detection</li>
            <li>• Seiche oscillations (5-30 min periods)</li>
            <li>• Infragravity waves (greater than 2 min periods)</li>
            <li>• Data artifacts (spikes, gaps, flatlines)</li>
            <li>• Extreme level events</li>
            <li>• Probable aliased short-period activity</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
