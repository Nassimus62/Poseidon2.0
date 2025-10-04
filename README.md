# Poseidon - Advanced Oceanographic Analysis Tool
> A sophisticated web application for analyzing sea-level time series data and automatically detecting oceanographic events including tidal phases, storm surges, seiches, and wave patterns.  

## Features  

### Core Functionality  
> - **File Upload**: Accepts .CSV/.TXT files with timestamp and sea-level data  
> - **Automated Event Detection**: Identifies multiple types of oceanographic events  
> - **Interactive Visualization**: Real-time plotting with event annotations  
> - **Export Capabilities**: Generate detailed Excel reports and charts  
> - **Weather Module**: Displays **temperature**, **wind speed**, and **atmospheric pressure** at a user-defined location. 

### Event Detection Capabilities  

#### Tidal Analysis  
> - **Rising/Falling Tide**: Detects tidal phase changes  
> - **High/Low Tide**: Identifies tidal extremes with precise timing  
> - **Tidal Separation**: Harmonic fit or low-pass filtering options  

#### Storm and Surge Events  
> - **Storm Surge**: Sustained residual offsets with amplitude and duration  
> - **Extreme Levels**: User-definable thresholds (default: 99th/1st percentile)  

#### Wave Pattern Analysis  
> - **Seiche Oscillations**: 5-30 minute period harbor resonance detection  
> - **Infragravity Waves**: >2 minute period wave analysis  
> - **Aliased Activity**: Detection of under-sampled high-frequency signals  

#### Data Quality Control  
> - **Spike Detection**: Identifies sudden anomalous jumps  
> - **Flatline Detection**: Finds periods of constant values  
> - **Gap Analysis**: Handles missing data with interpolation  

## Usage  

### Quick Start  
> 1. **Upload Data**: Drag & drop or select a CSV/TXT file  
> 2. **Configure Analysis**: Set tide removal method and thresholds  
> 3. **Run Analysis**: Click "Run Analysis" to process the data  
> 4. **Review Results**: Examine detected events in timeline and charts  
> 5. **Check Weather**: Enter latitude and longitude to view **temperature, wind speed, and pressure**  
> 6. **Export**: Generate Excel reports with full analysis details  

### File Format Requirements  
```
2024-01-01 01:12:00    1.47  
2024-01-01 01:13:00    1.48  
2024-01-01 01:14:00    1.49  
```  

**Supported Formats:**  
> - Timestamps: `YYYY-MM-DD HH:MM:SS` or `HH:MM`  
> - Sea levels: Numeric values (meters)  
> - Recommended: 1-minute interval data  

### Analysis Configuration  

#### Tide Removal Methods  
> - **Low-pass Filter** (Recommended): Moving-window polynomial fit for multi-hour tides  
> - **Harmonic Fit**: Fits M2, S2, K1, O1 tidal constituents  

#### Detection Thresholds  
> - **Extreme Level Threshold**: Set in centimeters (default: 30cm)  
> - **Confidence Levels**: High/Medium/Low event filtering  
> - **Time Range**: Optional analysis window selection  

## Technical Implementation  

### Signal Processing Techniques  
> - **Preprocessing**: Savitzky-Golay smoothing, gap filling, detrending  
> - **Spectral Analysis**: FFT for frequency content (Nyquist: 0.5 cyc/min)  
> - **Time-Frequency**: STFT and wavelet transforms for burst localization  
> - **Envelope Analysis**: Hilbert transform for amplitude detection  
> - **Change Point Detection**: Statistical methods for surge onset/offset  

### Event Classification  
Events are detected using:  
> - **Feature Fusion**: Slope, amplitude, spectral energy combination  
> - **Rule-Based Logic**: Confidence scoring (High/Medium/Low)  
> - **Matched Filtering**: Correlation with known harbor modes  
> - **Variance Analysis**: High-frequency content assessment  

### Export Formats  
> Excel exports include:  
> - Event timeline with timestamps and confidence levels  
> - Complete time series (original, detrended, residuals, tidal)  
> - Analysis summary and statistics  
> - Detailed event properties and explanations  

## Technology Stack  
> - **Frontend**: React, TypeScript, Tailwind CSS  
> - **Visualization**: Recharts for interactive plotting  
> - **File Processing**: Papa Parse for CSV handling  
> - **Export**: SheetJS (XLS) for Excel generation  
> - **UI Components**: Shadcn/ui component library  
> - **Weather API**: Fetches real-time weather data based on latitude/longitude  

### Credits:  
> - Made by: Nassim Mechat  
