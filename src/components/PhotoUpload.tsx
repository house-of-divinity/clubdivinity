"use client";

// Photo picker for the application form. User picks a file (camera
// or library on mobile, file picker on desktop), we resize + convert
// to WebP, then show a preview. The compressed File is held in state
// and surfaced via onChange so the parent can include it in submit.

import { useEffect, useRef, useState } from "react";
import { compressImage, formatBytes } from "@/lib/photo";

export type PhotoState = {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
};

export default function PhotoUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PhotoState | null;
  onChange: (p: PhotoState | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Release the object URL when the preview is swapped or unmounted.
  useEffect(() => {
    return () => {
      if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
    };
  }, [value?.previewUrl]);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like an image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Photo is over 20 MB. Try a smaller one.");
      return;
    }
    setBusy(true);
    try {
      const compressed = await compressImage(file);
      if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
      onChange({
        file: compressed,
        previewUrl: URL.createObjectURL(compressed),
        originalSize: file.size,
        compressedSize: compressed.size,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "couldn't process that photo");
    } finally {
      setBusy(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const remove = () => {
    if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <button
        type="button"
        className={"photo-slot" + (value ? " filled" : "")}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={value ? "Change photo" : label}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.previewUrl}
            alt="Selected"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div className="ps-content">
            <div className="ps-glyph">{busy ? "…" : "◇"}</div>
            <div className="ps-label">{busy ? "Processing" : label}</div>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        style={{ display: "none" }}
      />
      {value && (
        <div
          className="field-help"
          style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}
        >
          <span>
            {formatBytes(value.compressedSize)}{" "}
            {value.compressedSize < value.originalSize && (
              <span style={{ color: "var(--gold)" }}>
                · was {formatBytes(value.originalSize)}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={remove}
            style={{
              background: "none",
              border: 0,
              color: "var(--ink-mute)",
              textTransform: "uppercase",
              letterSpacing: ".16em",
              fontSize: 9.5,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            Remove
          </button>
        </div>
      )}
      {error && (
        <div className="field-help" style={{ color: "var(--wine)", marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
