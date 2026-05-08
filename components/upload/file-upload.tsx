"use client";

import { useRef, useState } from "react";
import {
  Upload, FileText, FileSpreadsheet, File, X,
  CheckCircle2, Loader2,
} from "lucide-react";

const ACCEPTED = [".csv", ".txt", ".json", ".md", ".xlsx", ".xls", ".pdf", ".docx"];
const MIME_MAP: Record<string, string> = {
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".md":  "text/markdown",
  ".json": "application/json",
};

export interface FileInfo {
  name: string;
  type: string;
  text: string;
  size: number;
}

interface FileUploadProps {
  onData: (files: FileInfo[]) => void;
  multiple?: boolean;
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  if (["xlsx","xls"].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  if (ext === "csv") return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
  if (ext === "json") return <File className="w-4 h-4 text-amber-500" />;
  if (["docx","doc"].includes(ext)) return <FileText className="w-4 h-4 text-blue-500" />;
  return <FileText className="w-4 h-4 text-gray-500" />;
}

function readBrowserFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (["xlsx","xls"].includes(ext)) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const { read, utils } = await import("xlsx");
          const wb = read(e.target?.result, { type: "array" });
          const sheets = wb.SheetNames.map(name => {
            const ws = wb.Sheets[name];
            return `Sheet: ${name}\n${utils.sheet_to_csv(ws)}`;
          });
          resolve(sheets.join("\n\n").slice(0, 12000));
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
      return;
    }

    if (ext === "json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          // Format nicely if array of objects
          if (Array.isArray(json) && json.length > 0) {
            const headers = Object.keys(json[0]).join(",");
            const rows = json.slice(0, 200).map(r => Object.values(r).join(",")).join("\n");
            resolve(`${headers}\n${rows}`);
          } else {
            resolve(JSON.stringify(json, null, 2).slice(0, 12000));
          }
        } catch { resolve(e.target?.result as string ?? ""); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
      return;
    }

    // CSV, TXT, MD — plain text
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string).slice(0, 12000));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function parseFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "docx", "doc"].includes(ext)) {
    // Server-side parse
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/parse-file", { method: "POST", body: form });
    if (!res.ok) throw new Error("Failed to parse file");
    const data = await res.json();
    return data.text ?? "";
  }
  return readBrowserFile(file);
}

export function FileUpload({ onData, multiple = true }: FileUploadProps) {
  const [files, setFiles] = useState<Array<FileInfo & { loading?: boolean }>>([]);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = async (incoming: File[]) => {
    const newEntries = incoming.map(f => ({
      name: f.name, type: f.type, text: "", size: f.size, loading: true,
    }));
    setFiles(prev => multiple ? [...prev, ...newEntries] : newEntries);

    const resolved: FileInfo[] = [];
    for (const [i, file] of incoming.entries()) {
      try {
        const text = await parseFile(file);
        const info: FileInfo = { name: file.name, type: file.type, text, size: file.size };
        resolved.push(info);
        setFiles(prev =>
          prev.map((f, idx) =>
            f.name === file.name && f.loading
              ? { ...info, loading: false }
              : f
          )
        );
      } catch {
        setFiles(prev => prev.filter(f => f.name !== file.name));
      }
    }

    const all = multiple
      ? [...files.filter(f => !f.loading), ...resolved]
      : resolved;

    if (resolved.length) onData(all.filter(f => f.text));
  };

  const remove = (name: string) => {
    const next = files.filter(f => f.name !== name);
    setFiles(next);
    onData(next.filter(f => f.text) as FileInfo[]);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handle(Array.from(e.dataTransfer.files)); }}
        onClick={() => ref.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-6 text-center
          ${dragging ? "border-indigo-400 bg-indigo-50 scale-[1.01]" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 bg-white"}`}
      >
        <input ref={ref} type="file" multiple={multiple}
          accept={ACCEPTED.join(",")} className="hidden"
          onChange={e => e.target.files && handle(Array.from(e.target.files))}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Upload className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-sm font-medium text-gray-700">Drop files or <span className="text-indigo-600 underline">browse</span></p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {["PDF","TXT","CSV","XLSX","DOCX","JSON","MD"].map(t => (
              <span key={t} className="text-[10px] font-semibold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.name}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all
                ${f.loading ? "border-gray-200 bg-gray-50" : "border-emerald-200 bg-emerald-50"}`}>
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                {f.loading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : fileIcon(f.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{f.name}</p>
                <p className="text-[10px] text-gray-500">
                  {f.loading ? "Parsing…" : `${(f.size / 1024).toFixed(0)} KB · ready`}
                </p>
              </div>
              {!f.loading && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <button onClick={e => { e.stopPropagation(); remove(f.name); }}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
