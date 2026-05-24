"use client";

// Poster upload field for the EventEditor. User picks an image →
// it uploads to Supabase Storage via POST /api/admin/events/poster
// → the returned public URL goes into the form's posterUrl.
//
// Shows a preview of the current poster + a "remove" button.

import { useRef, useState } from "react";

export default function PosterUpload({
  value,
  onChange,
}: {
  value: string;                            // current poster_url
  onChange: (url: string) => void;          // updates form.posterUrl
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("That isn't an image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image is over 10 MB. Try a smaller one.");
      return;
    }
    // Show local preview immediately for snappy UX.
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/events/poster", {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || "Upload failed");
      onChange(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const remove = () => {
    onChange("");
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Show whichever image we have — local preview (just uploaded) or
  // the saved URL from the event row.
  const displayUrl = preview || value;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onPick}
        style={{ display: "none" }}
      />

      <div
        className={"poster-upload" + (displayUrl ? " filled" : "")}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!busy && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        {displayUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayUrl} alt="Event poster" />
            <div className="poster-upload-actions">
              <button
                type="button"
                className="pu-btn"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                disabled={busy}
              >
                Replace
              </button>
              <button
                type="button"
                className="pu-btn pu-btn-rm"
                onClick={(e) => { e.stopPropagation(); remove(); }}
                disabled={busy}
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <div className="poster-upload-empty">
            <div className="pu-glyph">{busy ? "…" : "✦"}</div>
            <div className="pu-label">
              {busy ? "Uploading" : "Upload poster"}
            </div>
            <div className="pu-sub">
              JPG, PNG, or WebP · up to 10 MB
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            color: "var(--wine)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            marginTop: 8,
          }}
        >
          {error}
        </div>
      )}

      {value && !busy && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            letterSpacing: ".08em",
            color: "var(--ink-dim)",
            marginTop: 8,
            wordBreak: "break-all",
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}
