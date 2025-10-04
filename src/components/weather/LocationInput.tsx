import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { LocationInfo } from "@/types/weather";

interface LocationInputProps {
  onLocationSet: (location: LocationInfo) => void;
  disabled?: boolean;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  onLocationSet,
  disabled = false,
}) => {
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = () => {
    setError("");

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    // Validate coordinates
    if (isNaN(lat) || isNaN(lon)) {
      setError("Please enter valid numeric coordinates");
      return;
    }

    if (lat < -90 || lat > 90) {
      setError("Latitude must be between -90 and 90");
      return;
    }

    if (lon < -180 || lon > 180) {
      setError("Longitude must be between -180 and 180");
      return;
    }

    onLocationSet({ latitude: lat, longitude: lon });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Measurement Station Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="text"
              placeholder="e.g., 43.6532"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="text"
              placeholder="e.g., -79.3832"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        <Button
          onClick={handleSubmit}
          className="w-full mt-4"
          disabled={disabled || !latitude || !longitude}
        >
          Set Location
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          Enter the coordinates of your measurement station.
        </p>
      </CardContent>
    </Card>
  );
};
