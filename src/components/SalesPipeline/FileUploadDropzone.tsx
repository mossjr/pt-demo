import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';

interface FileUploadDropzoneProps {
  onCsvLoaded: (csvContent: string, fileName: string) => void;
  currentFileName: string | null;
  dealCount: number;
}

export const FileUploadDropzone: React.FC<FileUploadDropzoneProps> = ({
  onCsvLoaded,
  currentFileName,
  dealCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        onCsvLoaded(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      readFile(file);
    }
  };

  return (
    <div className="bg-[#122852] border border-[#3f7abb]/30 rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: Active File Info or Instructions */}
        <div className="flex items-center space-x-3 w-full lg:w-auto">
          <div className="p-3 bg-[#0d2045] rounded-xl border border-[#3f7abb]/40 text-[#ecdf51] flex-shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white">
                {currentFileName ? currentFileName : 'No Sales Data File Loaded'}
              </h3>
              {currentFileName && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ecdf51]/20 border border-[#ecdf51]/40 text-[#ecdf51] flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>{dealCount} Deals Active</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {currentFileName
                ? 'Dynamic formulas active. Drop a new CSV anytime to refresh dashboard.'
                : 'Upload a sales pipeline CSV file to validate and process clean metrics.'}
            </p>
          </div>
        </div>

        {/* Right: Upload Button & Dropzone trigger */}
        <div className="flex items-center space-x-3 w-full lg:w-auto justify-end">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`px-4 py-2.5 border-2 border-dashed rounded-xl cursor-pointer transition-all flex items-center space-x-2 text-xs font-semibold ${
              isDragging
                ? 'bg-[#3f7abb]/30 border-[#ecdf51] text-[#ecdf51]'
                : 'bg-[#3f7abb] hover:bg-[#3267a0] border-transparent text-white shadow-md'
            }`}
          >
            <Upload className="w-4 h-4 text-[#ecdf51]" />
            <span>{currentFileName ? 'Replace CSV File' : 'Upload Sales CSV'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
