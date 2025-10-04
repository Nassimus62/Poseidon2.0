import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, FileImage, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ProcessedData, DetectedEvent, FileData } from '@/types/poseidon';

interface ExportControlsProps {
  fileData: FileData | null;
  processedData: ProcessedData | null;
  events: DetectedEvent[];
}

export const ExportControls: React.FC<ExportControlsProps> = ({
  fileData,
  processedData,
  events
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    if (!fileData || !processedData || events.length === 0) return;

    setIsExporting(true);

    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Event Timeline
      const eventData = events.map(event => ({
        'Event ID': event.id,
        'Type': event.type,
        'Label': event.label,
        'Start Time': event.startTime.toISOString(),
        'End Time': event.endTime?.toISOString() || '',
        'Peak Time': event.peak?.toISOString() || '',
        'Confidence': event.confidence,
        'Amplitude (cm)': event.amplitude?.toFixed(2) || '',
        'Period (min)': event.period?.toFixed(1) || '',
        'Explanation': event.explanation,
        'Properties': JSON.stringify(event.properties)
      }));

      const eventWS = XLSX.utils.json_to_sheet(eventData);
      XLSX.utils.book_append_sheet(wb, eventWS, 'Event Timeline');

      // Sheet 2: Time Series Data
      const timeSeriesData = processedData.original.map((point, index) => ({
        'Timestamp': point.timestamp.toISOString(),
        'Original Sea Level (cm)': point.seaLevel.toFixed(2),
        'Detrended (cm)': processedData.detrended[index]?.seaLevel.toFixed(2) || '',
        'Tidal Component (cm)': processedData.tidal[index]?.seaLevel.toFixed(2) || '',
        'Residuals (cm)': processedData.residuals[index]?.seaLevel.toFixed(2) || '',
        'Original Index': point.originalIndex >= 0 ? point.originalIndex : 'Interpolated'
      }));

      const timeSeriesWS = XLSX.utils.json_to_sheet(timeSeriesData);
      XLSX.utils.book_append_sheet(wb, timeSeriesWS, 'Time Series Data');

      // Sheet 3: Analysis Summary
      const eventSummary = {
        'Analysis Summary': '',
        'Original File': fileData.filename,
        'Data Points': processedData.original.length,
        'Analysis Period': `${processedData.original[0]?.timestamp.toISOString()} to ${processedData.original[processedData.original.length - 1]?.timestamp.toISOString()}`,
        'Total Events Detected': events.length,
        'High Confidence Events': events.filter(e => e.confidence === 'High').length,
        'Medium Confidence Events': events.filter(e => e.confidence === 'Medium').length,
        'Low Confidence Events': events.filter(e => e.confidence === 'Low').length,
        'Event Types': '',
        ...Object.fromEntries(
          [...new Set(events.map(e => e.type))].map(type => [
            `${type} Events`,
            events.filter(e => e.type === type).length
          ])
        ),
        'Export Timestamp': new Date().toISOString()
      };

      // Convert summary object to array format for Excel
      const summaryData = Object.entries(eventSummary).map(([key, value]) => ({
        'Parameter': key,
        'Value': value
      }));

      const summaryWS = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Analysis Summary');

      // Sheet 4: Detailed Event Properties
      const detailedEvents = events.map(event => {
        const baseData = {
          'Event ID': event.id,
          'Type': event.type,
          'Label': event.label,
          'Start Time': event.startTime.toISOString(),
          'End Time': event.endTime?.toISOString() || '',
          'Confidence': event.confidence,
          'Explanation': event.explanation
        };

        // Add all properties as separate columns
        return { ...baseData, ...event.properties };
      });

      const detailedWS = XLSX.utils.json_to_sheet(detailedEvents);
      XLSX.utils.book_append_sheet(wb, detailedWS, 'Event Details');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `poseidon-analysis-${fileData.filename.replace(/\.[^/.]+$/, '')}-${timestamp}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportChart = async () => {
    // This would export the chart as PNG/PDF
    // For now, we'll just show a placeholder
    alert('Chart export feature coming soon! Use browser print function as alternative.');
  };

  const canExport = fileData && processedData && events.length > 0;

  const getEventTypeCount = (type: string) => {
    return events.filter(event => event.type === type).length;
  };

  const eventTypes = [...new Set(events.map(e => e.type))];

  return (
    <Card className="ocean-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Results
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Export Summary */}
        {canExport && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Analysis Results Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{events.length}</div>
                  <div className="text-xs text-muted-foreground">Total Events</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{events.filter(e => e.confidence === 'High').length}</div>
                  <div className="text-xs text-muted-foreground">High Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning">{events.filter(e => e.confidence === 'Medium').length}</div>
                  <div className="text-xs text-muted-foreground">Medium Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">{processedData?.original.length || 0}</div>
                  <div className="text-xs text-muted-foreground">Data Points</div>
                </div>
              </div>
            </div>

            {/* Event Type Breakdown */}
            {eventTypes.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">Event Types Detected</h5>
                <div className="flex flex-wrap gap-2">
                  {eventTypes.map(type => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}: {getEventTypeCount(type)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Export Actions */}
        <div className="space-y-4">
          <h4 className="font-medium">Export Options</h4>
          
          <div className="grid gap-3">
            {/* Excel Export */}
            <Button
              onClick={exportToExcel}
              disabled={!canExport || isExporting}
              className="w-full justify-start"
              variant="outline"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export to Excel (.xlsx)
                </>
              )}
            </Button>

            {/* Chart Export */}
            <Button
              onClick={exportChart}
              disabled={!canExport}
              className="w-full justify-start"
              variant="outline"
            >
              <FileImage className="w-4 h-4 mr-2" />
              Export Chart (PNG/PDF)
            </Button>
          </div>

          {!canExport && (
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Complete analysis to enable export options
              </p>
            </div>
          )}
        </div>

        {/* Export Details */}
        {canExport && (
          <div className="p-4 bg-ocean-mist rounded-lg">
            <h5 className="font-medium mb-2">Excel Export Includes:</h5>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Event timeline with full details and timestamps</li>
              <li>• Complete time series data (original, detrended, residuals)</li>
              <li>• Analysis summary and statistics</li>
              <li>• Event properties and detection parameters</li>
              <li>• Metadata and processing information</li>
            </ul>
          </div>
        )}

        {/* File Info */}
        {fileData && (
          <div className="text-xs text-muted-foreground">
            <p><strong>Source:</strong> {fileData.filename}</p>
            <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};