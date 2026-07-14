"use client";

import { useRef } from "react";

export function CustomUpload({
  uploading,
  onUpload,
}: {
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="upload-zone">
      <input
        ref={inputRef}
        id="logo-upload"
        type="file"
        accept="image/*"
        disabled={uploading}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
      <button
        type="button"
        className="upload-trigger"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <strong>{uploading ? "Wird hochgeladen…" : "Bild auswählen"}</strong>
        <span>PNG, JPG oder WEBP · max. 10 MB · 960×376 empfohlen</span>
      </button>
    </div>
  );
}
