import { useStore, type ImageSize } from '@/store/useStore';

interface SizeOption {
  key: ImageSize;
  label: string;       // 短标签：1:1
  desc: string;        // 实际像素：1024×1024
  ratio: string;       // 比例：1:1
}

/**
 * ⚠️ 当前为 OpenAI 标准最高档。Agnes 4K 字面量被 LiteLLM 拒，
 * 所以 4 个比例暂时都映射到 OpenAI DALL-E 3 标准尺寸白名单
 * （1024×1024 / 1792×1024 / 1024×1792 / 1024×1536）。
 * 4K 档位待 Agnes 开放后可一键切回。
 */
const sizes: SizeOption[] = [
  { key: '4K-1:1',   label: '1:1',  desc: '1024×1024',  ratio: '1:1'  },
  { key: '4K-16:9',  label: '16:9', desc: '1792×1024',  ratio: '16:9' },
  { key: '4K-9:16',  label: '9:16', desc: '1024×1792',  ratio: '9:16' },
  { key: '4K-3:4',   label: '3:4',  desc: '1024×1536',  ratio: '3:4'  },
];

export default function SizeSelector() {
  const { size, setSize } = useStore();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <span className="label">画幅</span>
        <div className="flex items-center gap-4">
          {sizes.map((s, idx) => {
            const isActive = size === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSize(s.key)}
                className="group flex flex-col items-start gap-0.5 transition-all duration-400"
              >
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-mono text-[10px] tracking-wider ${isActive ? 'text-umber' : 'text-paper-50/45'}`}>
                    0{idx + 1}
                  </span>
                  <span className={`font-sans text-xs tracking-wider transition-opacity ${isActive ? 'text-paper-50 opacity-100' : 'text-paper-50 opacity-50 group-hover:opacity-80'}`}>
                    {s.label}
                  </span>
                </div>
                <span className={`font-mono text-[9px] tracking-wider ${isActive ? 'text-umber/80' : 'text-paper-50/30'}`}>
                  {s.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <span className="font-mono text-[9px] text-paper-50/30 tracking-wider pl-[68px]">
        ↳ Agnes 4K 内测中，当前为该比例开放最高档
      </span>
    </div>
  );
}
