import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, X, Image as ImageIcon } from 'lucide-react';

interface PhotoDropzoneProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  onClear: () => void;
  label?: string;
  placeholder?: string;
  accentColor?: 'amber' | 'purple' | 'teal' | 'blue';
  maxDimension?: number;
  quality?: number;
}

export const PhotoDropzone: React.FC<PhotoDropzoneProps> = ({
  value,
  onChange,
  onClear,
  label = 'Upload Photo (Optional)',
  placeholder = 'Drag & drop photo here or click to browse',
  accentColor = 'amber',
  maxDimension = 800,
  quality = 0.8,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colorStyles = {
    amber: {
      borderDrag: 'border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/10',
      borderDefault: 'border-slate-800 hover:border-amber-500/50 bg-slate-950/60 hover:bg-slate-900',
      textAccent: 'text-amber-400',
      labelColor: 'text-amber-300',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      previewBorder: 'border-amber-500/40',
    },
    purple: {
      borderDrag: 'border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/10',
      borderDefault: 'border-slate-800 hover:border-purple-500/50 bg-slate-950/60 hover:bg-slate-900',
      textAccent: 'text-purple-400',
      labelColor: 'text-purple-300',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      previewBorder: 'border-purple-500/40',
    },
    teal: {
      borderDrag: 'border-teal-400 bg-teal-500/10 shadow-lg shadow-teal-500/10',
      borderDefault: 'border-slate-800 hover:border-teal-500/50 bg-slate-950/60 hover:bg-slate-900',
      textAccent: 'text-teal-400',
      labelColor: 'text-teal-300',
      badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      previewBorder: 'border-teal-500/40',
    },
    blue: {
      borderDrag: 'border-blue-400 bg-blue-500/10 shadow-lg shadow-blue-500/10',
      borderDefault: 'border-slate-800 hover:border-blue-500/50 bg-slate-950/60 hover:bg-slate-900',
      textAccent: 'text-blue-400',
      labelColor: 'text-blue-300',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      previewBorder: 'border-blue-500/40',
    },
  }[accentColor];

  const processFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        onChange(dataUrl);
        setIsCompressing(false);
      };
      img.onerror = () => setIsCompressing(false);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => setIsCompressing(false);
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={`text-xs font-semibold flex items-center gap-1.5 ${colorStyles.labelColor}`}>
          <Camera className={`w-3.5 h-3.5 ${colorStyles.textAccent}`} />
          <span>{label}</span>
        </label>
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Remove Photo</span>
          </button>
        )}
      </div>

      {value ? (
        <div className={`p-3 rounded-xl bg-slate-950 border ${colorStyles.previewBorder} flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <img
              src={value}
              alt="Uploaded Preview"
              className="w-16 h-14 object-cover rounded-lg border border-slate-700 shadow-sm"
            />
            <div className="space-y-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${colorStyles.badgeBg}`}>
                Photo Attached
              </span>
              <p className="text-[11px] text-slate-400">
                Ready to save with record
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Change Photo
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center space-y-1.5 ${
            isDragging ? colorStyles.borderDrag : colorStyles.borderDefault
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
            {isDragging ? (
              <UploadCloud className={`w-4 h-4 ${colorStyles.textAccent} animate-bounce`} />
            ) : (
              <Camera className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="text-xs font-medium text-slate-300">
            {isCompressing ? (
              <span className="text-teal-400 animate-pulse">Processing image...</span>
            ) : isDragging ? (
              <span className={colorStyles.textAccent}>Drop image here!</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            Drag & drop from desktop or click to upload PNG, JPG, or WEBP
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
