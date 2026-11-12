import { Bomb, Dices, Drama, EyeOff, Flame, Fingerprint, KeyRound, ListOrdered, Music, Timer, Gamepad2, Users, VenetianMask, type LucideProps } from 'lucide-react';
import type { GameAccent } from '../../types/game.types';

const ICONS: Record<string, React.FC<LucideProps>> = { Timer, Drama, EyeOff, Flame, KeyRound, Music, Bomb, VenetianMask, Fingerprint, Dices, Users, ListOrdered };

export function GameIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Gamepad2;
  return <Icon {...props} />;
}

export const ACCENT: Record<GameAccent, { bg: string; text: string; border: string; glow: string; edge: string }> = {
  purple: { bg: 'bg-brand-purple/25', text: 'text-violet-300', border: 'border-brand-purple', glow: 'shadow-neon', edge: 'border-violet-400/50' },
  pink: { bg: 'bg-brand-pink/25', text: 'text-pink-300', border: 'border-brand-pink', glow: 'shadow-[0_0_0_1px_rgba(236,72,153,.6),0_0_24px_rgba(236,72,153,.35)]', edge: 'border-pink-400/50' },
  cyan: { bg: 'bg-arcade-cyan/25', text: 'text-cyan-300', border: 'border-arcade-cyan', glow: 'shadow-neon-cyan', edge: 'border-cyan-400/50' },
  red: { bg: 'bg-arcade-red/25', text: 'text-red-300', border: 'border-arcade-red', glow: 'shadow-neon-red', edge: 'border-red-400/50' },
  amber: { bg: 'bg-arcade-amber/25', text: 'text-amber-300', border: 'border-arcade-amber', glow: 'shadow-[0_0_0_1px_rgba(245,158,11,.6),0_0_24px_rgba(245,158,11,.35)]', edge: 'border-amber-400/50' },
  violet: { bg: 'bg-[#A855F7]/25', text: 'text-purple-300', border: 'border-[#A855F7]', glow: 'shadow-[0_0_0_1px_rgba(168,85,247,.6),0_0_24px_rgba(168,85,247,.35)]', edge: 'border-purple-400/50' },
  green: { bg: 'bg-arcade-green/25', text: 'text-emerald-300', border: 'border-arcade-green', glow: 'shadow-neon-green', edge: 'border-emerald-400/50' },
  blue: { bg: 'bg-[#3B82F6]/25', text: 'text-blue-300', border: 'border-[#3B82F6]', glow: 'shadow-[0_0_0_1px_rgba(59,130,246,.6),0_0_24px_rgba(59,130,246,.35)]', edge: 'border-blue-400/50' },
  orange: { bg: 'bg-[#F97316]/25', text: 'text-orange-300', border: 'border-[#F97316]', glow: 'shadow-[0_0_0_1px_rgba(249,115,22,.6),0_0_24px_rgba(249,115,22,.35)]', edge: 'border-orange-400/50' },
};
