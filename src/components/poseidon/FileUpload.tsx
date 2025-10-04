import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Papa from "papaparse";
import { FileData, DataPoint } from "@/types/poseidon";

interface FileUploadProps {
  onFileLoaded: (fileData: FileData) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const parseTimestamp = (timeStr: string): Date | null => {
    // Handle different timestamp formats
    const formats = [
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, // YYYY-MM-DD HH:MM
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
      /^\d{2}:\d{2}$/, // HH:MM (assume today)
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO format
    ];

    for (const format of formats) {
      if (format.test(timeStr.trim())) {
        if (timeStr.includes(":") && !timeStr.includes("-")) {
          // HH:MM format - assume today
          const today = new Date().toISOString().split("T")[0];
          return new Date(`${today} ${timeStr}`);
        }
        return new Date(timeStr);
      }
    }
    return null;
  };

  const processFile = useCallback(
    (file: File) => {
      setIsProcessing(true);
      setUploadStatus("idle");
      setErrorMessage("");

      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        delimiter: "\t",
        complete: (results) => {
          try {
            const data: DataPoint[] = [];
            const errors: string[] = [];

            // Validate file structure
            if (results.data.length === 0) {
              throw new Error("File is empty");
            }

            const firstRow = results.data[0] as string[];
            if (firstRow.length < 2) {
              throw new Error(
                "File must contain at least 2 columns (timestamp and sea level)"
              );
            }

            // Process data rows
            results.data.forEach((row: any, index: number) => {
              if (row.length < 2) return;

              const timestampStr = String(row[0]).trim();
              const seaLevelStr = String(row[1]).trim();

              // Parse timestamp
              const timestamp = parseTimestamp(timestampStr);
              if (!timestamp || isNaN(timestamp.getTime())) {
                errors.push(
                  `Row ${index + 1}: Invalid timestamp format "${timestampStr}"`
                );
                return;
              }

              // Parse sea level
              const seaLevel = parseFloat(seaLevelStr);
              if (isNaN(seaLevel)) {
                errors.push(
                  `Row ${index + 1}: Invalid sea level value "${seaLevelStr}"`
                );
                return;
              }

              data.push({
                timestamp,
                seaLevel,
                originalIndex: index,
              });
            });

            // Validate processed data
            if (data.length === 0) {
              throw new Error("No valid data points found in file");
            }

            if (data.length < 10) {
              errors.push(
                "Warning: File contains very few data points, analysis may be limited"
              );
            }

            // Sort by timestamp
            data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            const fileData: FileData = {
              filename: file.name,
              data,
              isValid:
                errors.length === 0 ||
                errors.every((e) => e.startsWith("Warning")),
              errors,
            };

            setUploadStatus(fileData.isValid ? "success" : "error");
            onFileLoaded(fileData);
          } catch (error) {
            setUploadStatus("error");
            setErrorMessage(
              error instanceof Error ? error.message : "Unknown error occurred"
            );
          } finally {
            setIsProcessing(false);
          }
        },
        error: (error) => {
          setUploadStatus("error");
          setErrorMessage(`Failed to parse file: ${error.message}`);
          setIsProcessing(false);
        },
      });
    },
    [onFileLoaded]
  );

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop: (files) => {
        if (files.length > 0) {
          processFile(files[0]);
        }
      },
      accept: {
        "text/csv": [".csv"],
        "text/plain": [".txt"],
      },
      multiple: false,
      disabled: isProcessing,
    });

  return (
    <Card className="ocean-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Data Upload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-ocean
            ${
              isDragActive
                ? "border-primary bg-ocean-mist"
                : "border-border hover:border-primary bg-muted/30"
            }
            ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input {...getInputProps()} />
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          {isProcessing ? (
            <p className="text-muted-foreground">Processing file...</p>
          ) : isDragActive ? (
            <p className="text-primary font-medium">Drop the file here...</p>
          ) : (
            <>
              <p className="font-medium mb-2">
                Drag & drop or click to select a file
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Accepts .CSV or .TXT files
              </p>
              <Button variant="outline" size="sm">
                Select File
              </Button>
            </>
          )}
        </div>

        {/* Status Messages */}
        {uploadStatus === "success" && (
          <Alert className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              File uploaded successfully! {acceptedFiles[0]?.name} loaded with
              data ready for analysis.
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === "error" && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Format Requirements */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">File Format Requirements:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Two columns: timestamp, sea level height</li>
            <li>• Timestamps: YYYY-MM-DD HH:MM:SS</li>
            <li>• Sea levels: numeric values (meters)</li>
            <li>• One-minute interval data recommended</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
