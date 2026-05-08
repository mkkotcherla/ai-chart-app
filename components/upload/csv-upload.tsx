"use client";

import { useRef, useState } from "react";
import { Upload, FileText, X, CheckCircle2 } from "lucide-react";

export function CSVUpload({ onData }: { onData: (filename: string, preview: string, rawText: string) => void }) {
  const [file, setFile] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = (f: File) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFile(f.name);
      onData(f.name, text.split("\n").slice(0, 6).join("\n"), text);
    };
    reader.readAsText(f);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => ref.current?.click()}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all p-4 flex items-center gap-3
        ${dragging
          ? "border-indigo-400 bg-indigo-50 scale-[1.01]"
          : file
          ? "border-emerald-300 bg-emerald-50"
          : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 bg-white"}`}
    >
      <input ref={ref} type="file" accept=".csv,.txt" className="hidden"
        onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />

      {file ? (
        <>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{file}</p>
            <p className="text-xs text-emerald-600 font-medium">Loaded · AI will analyze this data</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setFile(null); }}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Upload className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Upload CSV file</p>
            <p className="text-xs text-gray-400">Drag & drop or click · AI will analyze and chart it</p>
          </div>
        </>
      )}
    </div>
  );
}
