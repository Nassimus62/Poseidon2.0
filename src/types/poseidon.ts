export interface DataPoint {
  timestamp: Date;
  seaLevel: number;
  originalIndex: number;
}

export interface ProcessedData {
  original: DataPoint[];
  detrended: DataPoint[];
  residuals: DataPoint[];
  tidal: DataPoint[];
}

export interface DetectedEvent {
  id: string;
  type: EventType;
  label: string;
  startTime: Date;
  endTime?: Date;
  confidence: 'High' | 'Medium' | 'Low';
  amplitude?: number;
  period?: number;
  explanation: string;
  peak?: Date;
  properties: Record<string, any>;
}

export type EventType =
  | 'Rising Tide'
  | 'Falling Tide'
  | 'High Tide'
  | 'Low Tide'
  | 'Storm Surge'
  | 'Seiche'
  | 'Infragravity'
  | 'Spike'
  | 'Flatline'
  | 'Gap'
  | 'Extreme Level'
  | 'Aliased Activity';

export interface AnalysisConfig {
  tideRemovalMethod: 'harmonic' | 'lowpass';
  extremeThreshold: number;
  confidenceThreshold: 'High' | 'Medium' | 'Low';
  startTime?: Date;
  endTime?: Date;
}

export interface SpectralAnalysis {
  frequencies: number[];
  powers: number[];
  dominantFrequency: number;
  dominantPeriod: number;
}

export interface FileData {
  filename: string;
  data: DataPoint[];
  isValid: boolean;
  errors: string[];
}
