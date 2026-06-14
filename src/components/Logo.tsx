export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* 极简艺术家印鉴：细线圈 + 中心点 */}
      <circle cx="16" cy="16" r="14" stroke="#1a1815" strokeWidth="1" fill="none" />
      <circle cx="16" cy="16" r="2" fill="#6b3d2e" />
      {/* 极细的十字参考线 */}
      <line x1="16" y1="2" x2="16" y2="6" stroke="#1a1815" strokeWidth="0.5" />
      <line x1="16" y1="26" x2="16" y2="30" stroke="#1a1815" strokeWidth="0.5" />
      <line x1="2" y1="16" x2="6" y2="16" stroke="#1a1815" strokeWidth="0.5" />
      <line x1="26" y1="16" x2="30" y2="16" stroke="#1a1815" strokeWidth="0.5" />
    </svg>
  );
}
