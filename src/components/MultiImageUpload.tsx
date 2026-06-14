import { useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { X } from 'lucide-react';

export default function MultiImageUpload() {
  const { multiImages, addMultiImage, removeMultiImage } = useStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1] || result;
      addMultiImage({ base64, name: file.name });
    };
    reader.readAsDataURL(file);
  }, [addMultiImage]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach((file) => handleFile(file));
  }, [handleFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  }, [handleFiles]);

  return (
    <div className="space-y-3">
      {multiImages.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {multiImages.map((img, index) => (
              <div
                key={index}
                className="relative group animate-fade-in"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <img
                  src={`data:image/png;base64,${img.base64}`}
                  alt={`参考图 ${index + 1}`}
                  className="w-full h-20 object-cover"
                />
                <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <button
                    onClick={() => removeMultiImage(index)}
                    className="text-paper"
                  >
                    <X size={12} />
                  </button>
                </div>
                <span className="absolute top-1.5 left-1.5 font-mono text-[8px] text-paper tracking-wider">
                  N°{String(index + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
          <div className="rule" />
        </>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        className={`
          upload-zone ${isDragOver ? 'drag-over' : ''}
          flex items-center justify-between px-5 py-3
        `}
        onClick={() => document.getElementById('multi-file-input')?.click()}
      >
        <span className="font-mono text-[10px] tracking-widest text-paper-200/60">
          {multiImages.length === 0 ? '拖入' : '继续添加'}
        </span>
        <span className="font-display italic text-sm text-paper-50">
          {multiImages.length === 0 ? '选择多张参考图' : '添加另一张'}
        </span>
        <span className="catalogue">{String(multiImages.length).padStart(2, '0')} / ∞</span>
        <input id="multi-file-input" type="file" accept="image/*" multiple onChange={handleInputChange} className="hidden" />
      </div>
    </div>
  );
}
