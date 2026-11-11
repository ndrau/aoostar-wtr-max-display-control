"use client";

import { useRef, useState } from "react";

export function CustomUpload({
  uploading,
  currentFile,
  onUpload,
}: {
  uploading: boolean;
  currentFile: string | null;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="stack">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={uploading}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        className={`upload-trigger ${dragging ? "is-dragging" : ""}`}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) onUpload(file);
        }}
      >
        <strong>
          {uploading
            ? "Wird hochgeladen…"
            : "Bild hierher ziehen oder auswählen"}
        </strong>
        <span>PNG, JPG oder WEBP · max. 10 MB · ideal 960×376 px</span>
      </button>
      <p className="hint">
        {currentFile
          ? "Das Bild wird sofort auf dem Display angezeigt."
          : "Noch kein Bild hochgeladen."}
      </p>
    </div>
  );
}
