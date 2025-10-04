import { DataPoint, ProcessedData, DetectedEvent, AnalysisConfig, SpectralAnalysis } from '@/types/poseidon';

export class PoseidonAnalysisEngine {
  private data: DataPoint[] = [];
  private config: AnalysisConfig;

  constructor(data: DataPoint[], config: AnalysisConfig) {
    this.data = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    this.config = config;
  }

  async runFullAnalysis(): Promise<{ processedData: ProcessedData; events: DetectedEvent[] }> {
    // Filter data by time range if specified
    const filteredData = this.filterDataByTimeRange();

    // Preprocessing
    const smoothedData = this.smoothData(filteredData);
    const gapFilledData = this.fillGaps(smoothedData);

    // Tidal component separation
    const tidalComponent = this.extractTidalComponent(gapFilledData);
    const detrended = this.detrendData(gapFilledData, tidalComponent);
    const residuals = this.calculateResiduals(gapFilledData, tidalComponent);

    const processedData: ProcessedData = {
      original: gapFilledData,
      detrended,
      residuals,
      tidal: tidalComponent
    };

    // Event detection
    const events: DetectedEvent[] = [];

    // Detect different types of events
    events.push(...await this.detectTidalPhases(gapFilledData, tidalComponent));
    events.push(...await this.detectStormSurges(residuals));
    events.push(...await this.detectSeiches(residuals));
    events.push(...await this.detectInfragravityWaves(residuals));
    events.push(...await this.detectDataArtifacts(gapFilledData));
    events.push(...await this.detectExtremeLevels(gapFilledData));
    events.push(...await this.detectAliasedActivity(residuals));

    // Filter events by confidence threshold
    const filteredEvents = events.filter(event => {
      const confidenceLevels = { 'Low': 0, 'Medium': 1, 'High': 2 };
      return confidenceLevels[event.confidence] >= confidenceLevels[this.config.confidenceThreshold];
    });

    return { processedData, events: filteredEvents };
  }

  private filterDataByTimeRange(): DataPoint[] {
    if (!this.config.startTime && !this.config.endTime) {
      return this.data;
    }

    return this.data.filter(point => {
      const timestamp = point.timestamp.getTime();
      const start = this.config.startTime?.getTime() || 0;
      const end = this.config.endTime?.getTime() || Infinity;
      return timestamp >= start && timestamp <= end;
    });
  }

  private smoothData(data: DataPoint[]): DataPoint[] {
    // Apply Savitzky-Golay-like smoothing using moving median
    const windowSize = 5;
    return data.map((point, index) => {
      const start = Math.max(0, index - Math.floor(windowSize / 2));
      const end = Math.min(data.length, index + Math.floor(windowSize / 2) + 1);
      const window = data.slice(start, end).map(p => p.seaLevel);
      window.sort((a, b) => a - b);
      const median = window[Math.floor(window.length / 2)];

      return {
        ...point,
        seaLevel: median
      };
    });
  }

  private fillGaps(data: DataPoint[]): DataPoint[] {
    // Simple gap filling using linear interpolation
    const result = [...data];
    const expectedInterval = 60000; // 1 minute in ms

    for (let i = 1; i < result.length; i++) {
      const timeDiff = result[i].timestamp.getTime() - result[i-1].timestamp.getTime();

      if (timeDiff > expectedInterval * 2) {
        // Fill gap with interpolated values
        const steps = Math.floor(timeDiff / expectedInterval) - 1;
        const levelDiff = result[i].seaLevel - result[i-1].seaLevel;

        for (let j = 1; j <= steps; j++) {
          const newTimestamp = new Date(result[i-1].timestamp.getTime() + j * expectedInterval);
          const newLevel = result[i-1].seaLevel + (levelDiff * j / (steps + 1));

          result.splice(i-1+j, 0, {
            timestamp: newTimestamp,
            seaLevel: newLevel,
            originalIndex: -1 // Mark as interpolated
          });
        }
        i += steps;
      }
    }

    return result;
  }

  private extractTidalComponent(data: DataPoint[]): DataPoint[] {
    if (this.config.tideRemovalMethod === 'harmonic') {
      return this.harmonicTidalFit(data);
    } else {
      return this.lowpassTidalFilter(data);
    }
  }

  private harmonicTidalFit(data: DataPoint[]): DataPoint[] {
    // Simple harmonic fit for M2 (12.42h), S2 (12h), K1 (23.93h), O1 (25.82h) components
    const periods = [12.42, 12.0, 23.93, 25.82]; // hours
    const values = data.map(p => p.seaLevel);
    const times = data.map(p => p.timestamp.getTime() / (1000 * 3600)); // hours

    // Compute mean
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Fit harmonics (simplified)
    let tidal = data.map((point, i) => {
      let tidalValue = mean;

      periods.forEach(period => {
        const omega = 2 * Math.PI / period;
        // Simplified amplitude estimation
        const amplitude = this.estimateAmplitude(values, times, omega);
        tidalValue += amplitude * Math.cos(omega * times[i]);
      });

      return {
        ...point,
        seaLevel: tidalValue
      };
    });

    return tidal;
  }

  private estimateAmplitude(values: number[], times: number[], omega: number): number {
    // Simple amplitude estimation using correlation
    let sumCos = 0, sumSin = 0;

    for (let i = 0; i < values.length; i++) {
      sumCos += values[i] * Math.cos(omega * times[i]);
      sumSin += values[i] * Math.sin(omega * times[i]);
    }

    return Math.sqrt(sumCos * sumCos + sumSin * sumSin) / (values.length / 2);
  }

  private lowpassTidalFilter(data: DataPoint[]): DataPoint[] {
    // Moving window polynomial fit (simplified to moving average)
    const windowHours = 4; // 4-hour window
    const windowSize = windowHours * 60; // minutes

    return data.map((point, index) => {
      const start = Math.max(0, index - windowSize);
      const end = Math.min(data.length, index + windowSize + 1);
      const window = data.slice(start, end);

      const sum = window.reduce((acc, p) => acc + p.seaLevel, 0);
      const tidalLevel = sum / window.length;

      return {
        ...point,
        seaLevel: tidalLevel
      };
    });
  }

  private detrendData(original: DataPoint[], tidal: DataPoint[]): DataPoint[] {
    return original.map((point, index) => ({
      ...point,
      seaLevel: point.seaLevel - (tidal[index]?.seaLevel || 0)
    }));
  }

  private calculateResiduals(original: DataPoint[], tidal: DataPoint[]): DataPoint[] {
    return this.detrendData(original, tidal);
  }

  private async detectTidalPhases(data: DataPoint[], tidal: DataPoint[]): Promise<DetectedEvent[]> {
    const events: DetectedEvent[] = [];
    const threshold = 0.02; // m threshold for tide change detection (changed from 2 cm)

    for (let i = 1; i < tidal.length - 1; i++) {
      const prev = tidal[i - 1];
      const curr = tidal[i];
      const next = tidal[i + 1];

      const prevSlope = curr.seaLevel - prev.seaLevel;
      const nextSlope = next.seaLevel - curr.seaLevel;

      // Detect high tide (peak)
      if (prevSlope > threshold && nextSlope < -threshold) {
        events.push({
          id: `high-tide-${i}`,
          type: 'High Tide',
          label: `High Tide (${curr.seaLevel.toFixed(3)} m)`,
          startTime: curr.timestamp,
          confidence: 'High',
          amplitude: curr.seaLevel,
          explanation: `Peak detected with incoming slope ${prevSlope.toFixed(3)} m/min and outgoing slope ${nextSlope.toFixed(3)} m/min`,
          properties: { level: curr.seaLevel, slope_in: prevSlope, slope_out: nextSlope }
        });
      }

      // Detect low tide (trough)
      if (prevSlope < -threshold && nextSlope > threshold) {
        events.push({
          id: `low-tide-${i}`,
          type: 'Low Tide',
          label: `Low Tide (${curr.seaLevel.toFixed(3)} m)`,
          startTime: curr.timestamp,
          confidence: 'High',
          amplitude: curr.seaLevel,
          explanation: `Trough detected with incoming slope ${prevSlope.toFixed(3)} m/min and outgoing slope ${nextSlope.toFixed(3)} m/min`,
          properties: { level: curr.seaLevel, slope_in: prevSlope, slope_out: nextSlope }
        });
      }

      // Detect rising/falling phases
      if (Math.abs(prevSlope) > threshold) {
        const type = prevSlope > 0 ? 'Rising Tide' : 'Falling Tide';
        const confidence = Math.abs(prevSlope) > threshold * 2 ? 'High' : 'Medium';

        events.push({
          id: `${type.toLowerCase().replace(' ', '-')}-${i}`,
          type,
          label: `${type} (${Math.abs(prevSlope).toFixed(3)} m/min)`,
          startTime: prev.timestamp,
          endTime: curr.timestamp,
          confidence,
          explanation: `Tidal ${type.toLowerCase()} detected with slope ${prevSlope.toFixed(4)} m/min`,
          properties: { slope: prevSlope }
        });
      }
    }

    return events;
  }

  private async detectStormSurges(residuals: DataPoint[]): Promise<DetectedEvent[]> {
    const events: DetectedEvent[] = [];
    const surgeThreshold = 0.15; // m (changed from 15 cm)
    const sustainedDuration = 60; // minutes

    let surgeStart: number | null = null;
    let maxSurge = 0;
    let maxSurgeTime: Date | null = null;

    for (let i = 0; i < residuals.length; i++) {
      const level = Math.abs(residuals[i].seaLevel);

      if (level > surgeThreshold) {
        if (surgeStart === null) {
          surgeStart = i;
          maxSurge = level;
          maxSurgeTime = residuals[i].timestamp;
        } else if (level > maxSurge) {
          maxSurge = level;
          maxSurgeTime = residuals[i].timestamp;
        }
      } else {
        if (surgeStart !== null) {
          const duration = i - surgeStart;
          if (duration >= sustainedDuration) {
            const confidence = maxSurge > surgeThreshold * 2 ? 'High' : 'Medium';

            events.push({
              id: `storm-surge-${surgeStart}`,
              type: 'Storm Surge',
              label: `Storm Surge (${maxSurge.toFixed(3)} m peak)`,
              startTime: residuals[surgeStart].timestamp,
              endTime: residuals[i - 1].timestamp,
              peak: maxSurgeTime!,
              confidence,
              amplitude: maxSurge,
              explanation: `Sustained surge detected with ${maxSurge.toFixed(3)} m peak amplitude over ${duration} minutes`,
              properties: {
                peak_amplitude: maxSurge,
                duration_minutes: duration,
                surge_type: residuals[surgeStart].seaLevel > 0 ? 'positive' : 'negative'
              }
            });
          }

          surgeStart = null;
          maxSurge = 0;
          maxSurgeTime = null;
        }
      }
    }

    return events;
  }

  private async detectSeiches(residuals: DataPoint[]): Promise<DetectedEvent[]> {
    const events: DetectedEvent[] = [];
    const spectral = this.computeSpectralAnalysis(residuals);

    // Look for energy peaks in 5-30 minute period band
    const seicheFreqMin = 1 / 30; // cycles per minute for 30-min period
    const seicheFreqMax = 1 / 5;  // cycles per minute for 5-min period

    spectral.frequencies.forEach((freq, i) => {
      if (freq >= seicheFreqMin && freq <= seicheFreqMax) {
        const power = spectral.powers[i];
        const threshold = this.calculateSpectralThreshold(spectral.powers) * 2;

        if (power > threshold) {
          const period = 1 / freq; // minutes
          const confidence = power > threshold * 1.5 ? 'High' : 'Medium';

          // Find time windows with high energy at this frequency
          const energyPeaks = this.findEnergyBursts(residuals, freq, period);

          energyPeaks.forEach((peak, index) => {
            events.push({
              id: `seiche-${freq.toFixed(4)}-${index}`,
              type: 'Seiche',
              label: `Seiche Oscillation (${period.toFixed(1)} min period)`,
              startTime: peak.start,
              endTime: peak.end,
              confidence,
              period,
              explanation: `Seiche detected with dominant period ${period.toFixed(1)} minutes and spectral energy peak at ${freq.toFixed(4)} cyc/min`,
              properties: {
                frequency: freq,
                spectral_power: power,
                estimated_period: period
              }
            });
          });
        }
      }
    });

    return events;
  }

  private async detectInfragravityWaves(residuals: DataPoint[]): Promise<DetectedEvent[]> {
    const events: DetectedEvent[] = [];
    const spectral = this.computeSpectralAnalysis(residuals);

    // Look for energy in 2+ minute periods (< 0.5 cyc/min)
    const igFreqMax = 0.5; // cycles per minute

    let totalIgEnergy = 0;
    let dominantFreq = 0;
    let maxPower = 0;

    spectral.frequencies.forEach((freq, i) => {
      if (freq <= igFreqMax && freq > 0) {
        const power = spectral.powers[i];
        totalIgEnergy += power;

        if (power > maxPower) {
          maxPower = power;
          dominantFreq = freq;
        }
      }
    });

    const threshold = this.calculateSpectralThreshold(spectral.powers);

    if (totalIgEnergy > threshold) {
      const dominantPeriod = 1 / dominantFreq; // minutes
      const confidence = totalIgEnergy > threshold * 2 ? 'High' : 'Medium';

      events.push({
        id: 'infragravity-waves',
        type: 'Infragravity',
        label: `Infragravity Activity (${dominantPeriod.toFixed(1)} min dominant period)`,
        startTime: residuals[0].timestamp,
        endTime: residuals[residuals.length - 1].timestamp,
        confidence,
        period: dominantPeriod,
        explanation: `Infragravity wave activity detected with dominant period ${dominantPeriod.toFixed(1)} minutes and total band energy ${totalIgEnergy.toFixed(2)}`,
        properties: {
          total_energy: totalIgEnergy,
          dominant_frequency: dominantFreq,
          band_max_freq: igFreqMax
        }
      });
    }

    return events;
  }

  private async detectDataArtifacts(data: DataPoint[]): Promise<DetectedEvent[]> {
    const events: DetectedEvent[] = [];

    // Detect spikes
    const spikeThreshold = 0.5; // m sudden change (changed from 50 cm)
    for (let i = 1; i < data.length; i++) {
      const change = Math.abs(data[i].seaLevel - data[i-1].seaLevel);

      if (change > spikeThreshold) {
        events.push({
          id: `spike-${i}`,
          type: 'Spike',
          label: `Data Spike (${change.toFixed(3)} m jump)`,
          startTime: data[i].timestamp,
          confidence: 'High',
          amplitude: change,
          explanation: `Sudden level change of ${change.toFixed(3)} m detected between consecutive measurements`,
          properties: { magnitude: change, previous_level: data[i-1].seaLevel, current_level: data[i].seaLevel }
        });
      }
    }

    // Detect flatlines
    const flatlineThreshold = 0.001; // m (changed from 0.1 cm)
    const minFlatlineDuration = 30; // minutes

    let flatlineStart: number | null = null;
    let flatlineValue: number | null = null;

    for (let i = 1; i < data.length; i++) {
      const change = Math.abs(data[i].seaLevel - data[i-1].seaLevel);

      if (change <= flatlineThreshold) {
        if (flatlineStart === null) {
          flatlineStart = i - 1;
          flatlineValue = data[i-1].seaLevel;
        }
      } else {
        if (flatlineStart !== null) {
          const duration = i - flatlineStart;
          if (duration >= minFlatlineDuration) {
            events.push({
              id: `flatline-${flatlineStart}`,
              type: 'Flatline',
              label: `Data Flatline (${duration} min at ${flatlineValue!.toFixed(3)} m)`,
              startTime: data[flatlineStart].timestamp,
              endTime: data[i-1].timestamp,
              confidence: 'High',
              explanation: `Constant value ${flatlineValue!.toFixed(4)} m maintained for ${duration} minutes`,
              properties: {
                constant_value: flatlineValue!,
                duration_minutes: duration
              }
            });
          }

          flatlineStart = null;
          flatlineValue = null;
        }
      }
    }

    return events;
  }

  private async detectExtremeLevels(data: DataPoint[]): Promise<DetectedEvent[]> {
    const events: DetectedEvent[] = [];
    const levels = data.map(p => p.seaLevel);
    const mean = levels.reduce((sum, val) => sum + val, 0) / levels.length;

    // Use both percentile-based and threshold-based detection
    levels.sort((a, b) => a - b);
    const p1 = levels[Math.floor(levels.length * 0.01)];
    const p99 = levels[Math.floor(levels.length * 0.99)];

    const threshold = this.config.extremeThreshold;

    data.forEach(point => {
      const isExtreme = point.seaLevel <= p1 ||
                       point.seaLevel >= p99 ||
                       Math.abs(point.seaLevel - mean) > threshold;

      if (isExtreme) {
        const type = point.seaLevel > mean ? 'High' : 'Low';
        const confidence = Math.abs(point.seaLevel - mean) > threshold * 1.5 ? 'High' : 'Medium';

        events.push({
          id: `extreme-${point.timestamp.getTime()}`,
          type: 'Extreme Level',
          label: `Extreme ${type} Level (${point.seaLevel.toFixed(3)} m)`,
          startTime: point.timestamp,
          confidence,
          amplitude: Math.abs(point.seaLevel - mean),
          explanation: `Level ${point.seaLevel.toFixed(3)} m exceeds ${confidence.toLowerCase()} threshold (${threshold} m from mean)`,
          properties: {
            level: point.seaLevel,
            deviation_from_mean: point.seaLevel - mean,
            percentile: point.seaLevel <= p1 ? '1st' : (point.seaLevel >= p99 ? '99th' : 'threshold')
          }
        });
      }
    });

    return events;
  }

  private async detectAliasedActivity(residuals: DataPoint[]): Promise<DetectedEvent[]> {
    const events: DetectedEvent[] = [];

    // Look for high-frequency variance that might indicate aliased waves
    const variance = this.calculateMovingVariance(residuals, 10); // 10-minute windows
    const spectral = this.computeSpectralAnalysis(residuals);

    // Check for suspicious spectral signature (high energy at Nyquist frequency)
    const nyquistFreq = 0.5; // cycles per minute for 1-min sampling
    const nyquistIndex = spectral.frequencies.findIndex(f => f >= nyquistFreq * 0.9);

    if (nyquistIndex !== -1) {
      const nyquistPower = spectral.powers[nyquistIndex];
      const meanPower = spectral.powers.reduce((sum, p) => sum + p, 0) / spectral.powers.length;

      if (nyquistPower > meanPower * 3) {
        // High energy near Nyquist suggests aliasing
        const highVariancePeriods = variance
          .map((v, i) => ({ variance: v, index: i }))
          .filter(item => item.variance > this.calculateVarianceThreshold(variance))
          .map(item => ({
            start: residuals[item.index].timestamp,
            end: residuals[Math.min(item.index + 10, residuals.length - 1)].timestamp,
            variance: item.variance
          }));

        highVariancePeriods.forEach((period, index) => {
          events.push({
            id: `aliased-${index}`,
            type: 'Aliased Activity',
            label: `Probable Aliased Waves (${period.variance.toFixed(6)} variance)`,
            startTime: period.start,
            endTime: period.end,
            confidence: 'Low',
            explanation: `High variance (${period.variance.toFixed(6)}) and energy near Nyquist frequency (${nyquistFreq} cyc/min) suggest aliased short-period waves`,
            properties: {
              variance: period.variance,
              nyquist_power: nyquistPower,
              mean_power: meanPower,
              power_ratio: nyquistPower / meanPower
            }
          });
        });
      }
    }

    return events;
  }

  // Helper methods for spectral analysis
  private computeSpectralAnalysis(data: DataPoint[]): SpectralAnalysis {
    // Simplified FFT-like analysis
    const values = data.map(p => p.seaLevel);
    const n = values.length;
    const frequencies: number[] = [];
    const powers: number[] = [];

    // Generate frequency bins (cycles per minute)
    const maxFreq = 0.5; // Nyquist for 1-min sampling
    const freqStep = maxFreq / (n / 2);

    for (let i = 0; i < n / 2; i++) {
      const freq = i * freqStep;
      frequencies.push(freq);

      // Compute power using simple correlation method
      let power = 0;
      for (let j = 0; j < n; j++) {
        power += values[j] * Math.cos(2 * Math.PI * freq * j) +
                 values[j] * Math.sin(2 * Math.PI * freq * j);
      }
      powers.push(Math.abs(power) / n);
    }

    // Find dominant frequency
    let maxPower = 0;
    let dominantFreq = 0;

    powers.forEach((power, i) => {
      if (power > maxPower && frequencies[i] > 0) {
        maxPower = power;
        dominantFreq = frequencies[i];
      }
    });

    return {
      frequencies,
      powers,
      dominantFrequency: dominantFreq,
      dominantPeriod: dominantFreq > 0 ? 1 / dominantFreq : 0
    };
  }

  private findEnergyBursts(data: DataPoint[], frequency: number, period: number): { start: Date; end: Date }[] {
    // Simplified energy burst detection
    const windowSize = Math.max(10, Math.floor(period * 2)); // At least 2 periods
    const bursts: { start: Date; end: Date }[] = [];

    for (let i = 0; i < data.length - windowSize; i += Math.floor(windowSize / 2)) {
      const window = data.slice(i, i + windowSize);
      const energy = this.calculateWindowEnergy(window, frequency);

      if (energy > this.calculateEnergyThreshold(data, frequency)) {
        bursts.push({
          start: window[0].timestamp,
          end: window[window.length - 1].timestamp
        });
      }
    }

    return bursts;
  }

  private calculateWindowEnergy(window: DataPoint[], frequency: number): number {
    let energy = 0;
    const values = window.map(p => p.seaLevel);

    for (let i = 0; i < values.length; i++) {
      energy += values[i] * Math.cos(2 * Math.PI * frequency * i) +
               values[i] * Math.sin(2 * Math.PI * frequency * i);
    }

    return Math.abs(energy) / values.length;
  }

  private calculateEnergyThreshold(data: DataPoint[], frequency: number): number {
    // Simple threshold based on overall energy at this frequency
    return this.calculateWindowEnergy(data, frequency) * 0.5;
  }

  private calculateSpectralThreshold(powers: number[]): number {
    const mean = powers.reduce((sum, p) => sum + p, 0) / powers.length;
    const variance = powers.reduce((sum, p) => sum + (p - mean) ** 2, 0) / powers.length;
    return mean + Math.sqrt(variance);
  }

  private calculateMovingVariance(data: DataPoint[], windowSize: number): number[] {
    const variance: number[] = [];

    for (let i = 0; i < data.length - windowSize; i++) {
      const window = data.slice(i, i + windowSize).map(p => p.seaLevel);
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const var_val = window.reduce((sum, val) => sum + (val - mean) ** 2, 0) / window.length;
      variance.push(var_val);
    }

    return variance;
  }

  private calculateVarianceThreshold(variance: number[]): number {
    const mean = variance.reduce((sum, v) => sum + v, 0) / variance.length;
    const std = Math.sqrt(variance.reduce((sum, v) => sum + (v - mean) ** 2, 0) / variance.length);
    return mean + 2 * std; // 2-sigma threshold
  }
}