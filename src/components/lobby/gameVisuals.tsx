import { Bomb, Drama, KeyRound, Music, Timer, Gamepad2, type LucideProps } from 'lucide-react';
import type { MascarenhasGamePlugin } from '../../types/game.types';

const ICONS: Record<string, React.FC<LucideProps>> = { Timer, Drama, KeyRound, Music, Bomb };

export function GameIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Gamepad2;
  return <Icon {...props} />;
}

export const ACCENT: Record<MascarenhasGamePlugin['accentColor'], { bg: string; text: string; border: string; glow: string }> = {
  purple: { bg: 'bg-brand-purple/15', text: 'text-violet-300', border: 'border-brand-purple', glow: 'shadow-neon' },
  pink: { bg: 'bg-brand-pink/15', text: 'text-pink-300', border: 'border-brand-pink', glow: 'shadow-[0_0_0_1px_rgba(236,72,153,.6),0_0_24px_rgba(236,72,153,.35)]' },
  cyan: { bg: 'bg-arcade-cyan/15', text: 'text-cyan-300', border: 'border-arcade-cyan', glow: 'shadow-neon-cyan' },
  red: { bg: 'bg-arcade-red/15', text: 'text-red-300', border: 'border-arcade-red', glow: 'shadow-neon-red' },
  amber: { bg: 'bg-arcade-amber/15', text: 'text-amber-300', border: 'border-arcade-amber', glow: 'shadow-[0_0_0_1px_rgba(245,158,11,.6),0_0_24px_rgba(245,158,11,.35)]' },
};
