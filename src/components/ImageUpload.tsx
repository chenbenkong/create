import { useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { X } from 'lucide-react';

export default function ImageUpload() {
  const { referenceImage, referenceImageName, setReferenceImage } = useStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1] || result;
      setReferenceImage(base64, file.name);
    };
    reader.readAsDataURL(file);
  }, [setReferenceImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (referenceImage) {
    return (
      <div className="relative group animate-fade-in">
        <img
          src={`data:image/png;base64,${referenceImage}`}
          alt="参考图"
          className="w-full h-44 object-cover"
        />
        <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
          <button
            onClick={() => setReferenceImage(null, null)}
            className="editorial-btn flex items-center gap-1.5 text-paper"
          >
            <X size={12} />
            <span className="text-xs tracking-widest">移除</span>
          </button>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="label">参考图</span>
          <span className="catalogue truncate max-w-[160px]">{referenceImageName || '未命名'}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      className={`
        upload-zone ${isDragOver ? 'drag-over' : ''}
        flex flex-col items-center justify-center gap-2 h-44 px-6
      `}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <span className="font-mono text-[10px] tracking-widest text-paper-200/60">拖拽 或 上传</span>
      <p className="font-display italic text-base text-paper-50 text-center">
        选择一张参考图
      </p>
      <p className="text-[10px] text-paper-200/60 tracking-wider font-mono">PNG · JPG · WEBP</p>
      <input id="file-input" type="file" accept="image/*" onChange={handleInputChange} className="hidden" />
    </div>
  );
}
