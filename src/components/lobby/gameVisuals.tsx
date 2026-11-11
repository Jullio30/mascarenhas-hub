import { Bomb, Dices, Drama, EyeOff, Flame, Fingerprint, KeyRound, ListOrdered, Music, Timer, Gamepad2, Users, VenetianMask, type LucideProps } from 'lucide-react';
import type { GameAccent } from '../../types/game.types';

const ICONS: Record<string, React.FC<LucideProps>> = { Timer, Drama, EyeOff, Flame, KeyRound, Music, Bomb, VenetianMask, Fingerprint, Dices, Users, ListOrdered };

export function GameIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Gamepad2;
  return <Icon {...props} />;
}

export const ACCENT: Record<GameAccent, { bg: string; text: string; border: string; glow: string }> = {
  purple: { bg: 'bg-brand-purple/15', text: 'text-violet-300', border: 'border-brand-purple', glow: 'shadow-neon' },
  pink: { bg: 'bg-brand-pink/15', text: 'text-pink-300', border: 'border-brand-pink', glow: 'shadow-[0_0_0_1px_rgba(236,72,153,.6),0_0_24px_rgba(236,72,153,.35)]' },
  cyan: { bg: 'bg-arcade-cyan/15', text: 'text-cyan-300', border: 'border-arcade-cyan', glow: 'shadow-neon-cyan' },
  red: { bg: 'bg-arcade-red/15', text: 'text-red-300', border: 'border-arcade-red', glow: 'shadow-neon-red' },
  amber: { bg: 'bg-arcade-amber/15', text: 'text-amber-300', border: 'border-arcade-amber', glow: 'shadow-[0_0_0_1px_rgba(245,158,11,.6),0_0_24px_rgba(245,158,11,.35)]' },
  violet: { bg: 'bg-[#A855F7]/15', text: 'text-purple-300', border: 'border-[#A855F7]', glow: 'shadow-[0_0_0_1px_rgba(168,85,247,.6),0_0_24px_rgba(168,85,247,.35)]' },
  green: { bg: 'bg-arcade-green/15', text: 'text-emerald-300', border: 'border-arcade-green', glow: 'shadow-neon-green' },
  blue: { bg: 'bg-[#3B82F6]/15', text: 'text-blue-300', border: 'border-[#3B82F6]', glow: 'shadow-[0_0_0_1px_rgba(59,130,246,.6),0_0_24px_rgba(59,130,246,.35)]' },
  orange: { bg: 'bg-[#F97316]/15', text: 'text-orange-300', border: 'border-[#F97316]', glow: 'shadow-[0_0_0_1px_rgba(249,115,22,.6),0_0_24px_rgba(249,115,22,.35)]' },
};
