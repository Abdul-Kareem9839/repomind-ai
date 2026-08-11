import React, { useRef } from 'react';

export default function FileDropzone({ file, onChange, accept = '.zip' }) {
  const inputRef = useRef(null);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) onChange(dropped);
      }}
      className="cursor-pointer rounded border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 hover:border-gray-400"
    >
      {file ? file.name : 'Click or drag a .zip file here'}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}
