import { useStore, type Mode, type ModeGroup, getModeGroup } from '@/store/useStore';

const groups: { key: ModeGroup; label: string; sublabel: string; defaultMode: Mode; index: string }[] = [
  { key: 'image', label: '图像', sublabel: '图', defaultMode: 'text2img', index: '01' },
  { key: 'video', label: '影像', sublabel: '影', defaultMode: 'text2video', index: '02' },
  { key: 'chat', label: '对话', sublabel: '话', defaultMode: 'chat', index: '03' },
];

const subModes: { key: Mode; label: string; group: ModeGroup }[] = [
  { key: 'text2img', label: '文生图', group: 'image' },
  { key: 'img2img', label: '图生图', group: 'image' },
  { key: 'text2video', label: '文生视频', group: 'video' },
  { key: 'img2video', label: '图生视频', group: 'video' },
  { key: 'multi2video', label: '多图生视频', group: 'video' },
];

export default function ModeSwitch() {
  const { mode, setMode } = useStore();
  const currentGroup = getModeGroup(mode);
  const currentSubModes = subModes.filter((m) => m.group === currentGroup);

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex items-center gap-8">
        {groups.map((g) => {
          const isActive = currentGroup === g.key;
          return (
            <button
              key={g.key}
              onClick={() => { if (!isActive) setMode(g.defaultMode); }}
              className={`
                group flex flex-col items-end gap-1 transition-all duration-500
                ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'}
              `}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] tracking-widest text-paper-50/55">N°{g.index}</span>
                <span className="font-display text-base tracking-wider text-paper-50">{g.label}</span>
              </div>
              {isActive && <span className="w-6 h-px bg-paper-50 mt-1" />}
            </button>
          );
        })}
      </div>

      {currentSubModes.length > 1 && (
        <div className="flex items-center gap-5">
          {currentSubModes.map((m) => {
            const isActive = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`
                  group transition-all duration-400
                  ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'}
                `}
              >
                <span className="text-xs font-sans tracking-wider text-paper-50">{m.label}</span>
                {isActive && <span className="ml-1.5 text-umber font-mono text-[10px]">—</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
