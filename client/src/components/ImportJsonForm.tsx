import { useRef, useState } from "react";
import type { ImportSongPayload } from "../types/song";

type Props = {
  onImport: (entries: ImportSongPayload[]) => Promise<{ imported: number }>;
};

const EXAMPLE = `[
  {
    "title": "Blinding Lights",
    "artist": "The Weeknd",
    "genre": "Pop",
    "primary_genre": "Pop",
    "subgenres": ["Alternative R&B", "Dance-pop", "Pop", "R&B"],
    "features": {
      "tempo": 0.1867,
      "energy": 1.0,
      "danceability": 0.3249,
      "valence": 0.268,
      "acousticness": 0.5479,
      "bpm_raw": 86.1
    }
  }
]`;

function parseJsonText(text: string): unknown {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) throw new Error("File is empty");
  return JSON.parse(cleaned);
}

function asNumber(value: unknown, label: string): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  throw new Error(`${label} must be a number`);
}

function validateImportPayload(data: unknown): ImportSongPayload[] {
  if (!Array.isArray(data)) {
    throw new Error("JSON must be an array of songs");
  }

  return data.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Row ${index + 1}: expected an object`);
    }

    const { title, artist, genre, primary_genre, primaryGenre, subgenres, features } =
      item as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      throw new Error(`Row ${index + 1}: title is required`);
    }
    if (typeof artist !== "string" || !artist.trim()) {
      throw new Error(`Row ${index + 1}: artist is required`);
    }
    if (genre !== undefined && typeof genre !== "string") {
      throw new Error(`Row ${index + 1}: genre must be a string`);
    }
    if (primary_genre !== undefined && typeof primary_genre !== "string") {
      throw new Error(`Row ${index + 1}: primary_genre must be a string`);
    }
    if (primaryGenre !== undefined && typeof primaryGenre !== "string") {
      throw new Error(`Row ${index + 1}: primaryGenre must be a string`);
    }
    if (subgenres !== undefined && !Array.isArray(subgenres)) {
      throw new Error(`Row ${index + 1}: subgenres must be an array`);
    }
    if (!features || typeof features !== "object") {
      throw new Error(`Row ${index + 1}: features object is required`);
    }

    const featureObj = features as Record<string, unknown>;
    const normalizedFeatures = {
      tempo: asNumber(featureObj.tempo, `Row ${index + 1}: features.tempo`),
      energy: asNumber(featureObj.energy, `Row ${index + 1}: features.energy`),
      danceability: asNumber(featureObj.danceability, `Row ${index + 1}: features.danceability`),
      valence: asNumber(featureObj.valence, `Row ${index + 1}: features.valence`),
      acousticness: asNumber(featureObj.acousticness, `Row ${index + 1}: features.acousticness`),
      ...(typeof featureObj.bpm_raw === "number" ? { bpm_raw: featureObj.bpm_raw } : {}),
    };

    const resolvedPrimary =
      typeof primary_genre === "string"
        ? primary_genre.trim()
        : typeof primaryGenre === "string"
          ? primaryGenre.trim()
          : typeof genre === "string"
            ? genre.trim()
            : undefined;

    const parsedSubgenres = Array.isArray(subgenres)
      ? subgenres.map((tag, i) => {
          if (typeof tag !== "string" || !tag.trim()) {
            throw new Error(`Row ${index + 1}: subgenres[${i}] must be a non-empty string`);
          }
          return tag.trim();
        })
      : [];

    return {
      title: title.trim(),
      artist: artist.trim(),
      genre: resolvedPrimary ?? (typeof genre === "string" ? genre.trim() : undefined),
      primaryGenre: resolvedPrimary,
      subgenres: parsedSubgenres,
      features: normalizedFeatures,
    };
  });
}

export function ImportJsonForm({ onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportSongPayload[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      const parsed = validateImportPayload(parseJsonText(text));
      setPreview(parsed);
      setFileName(file.name);
    } catch (err) {
      setPreview(null);
      setFileName(null);
      if (err instanceof SyntaxError) {
        setError(`Invalid JSON syntax: ${err.message}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Could not read JSON file");
    }
  };

  const handleImport = async () => {
    if (!preview?.length) return;

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await onImport(preview);
      setSuccess(`Imported ${result.imported} song${result.imported === 1 ? "" : "s"}`);
      setPreview(null);
      setFileName(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
      <h2 className="mb-1 text-lg font-semibold text-zinc-100">Import JSON</h2>
      <p className="mb-4 text-sm text-zinc-500">
        Upload a JSON array of songs. Features are min-max normalized across the batch on import.
        Supports <code className="text-zinc-400">subgenres</code> and{" "}
        <code className="text-zinc-400">primary_genre</code>.
      </p>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-8 transition hover:border-violet-500/50 hover:bg-zinc-900/70">
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <p className="text-sm text-zinc-300">
          {fileName ? fileName : "Choose a .json file or drop it here"}
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Array of songs with title, artist, genre, subgenres, features
        </p>
      </label>

      {preview && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-300">
            Ready to import <span className="font-semibold text-violet-300">{preview.length}</span>{" "}
            song{preview.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-zinc-500">
            {preview.slice(0, 5).map((song, i) => (
              <li key={`${song.title}-${i}`}>
                {song.title} — {song.artist}
              </li>
            ))}
            {preview.length > 5 && <li>…and {preview.length - 5} more</li>}
          </ul>
          <button
            onClick={() => void handleImport()}
            disabled={importing}
            className="mt-4 w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {importing ? "Importing..." : `Import ${preview.length} songs`}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-400">{success}</p>}

      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400">
          Show expected format
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-400">
          {EXAMPLE}
        </pre>
      </details>
    </section>
  );
}
