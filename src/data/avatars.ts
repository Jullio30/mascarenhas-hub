export interface AvatarDef {
  id: string;
  emoji: string;
  color: string;
  label: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 'neon-fox', emoji: '🦊', color: '#F97316', label: 'Raposa Neon' },
  { id: 'cyber-cat', emoji: '🐱', color: '#EC4899', label: 'Gato Cyber' },
  { id: 'pixel-frog', emoji: '🐸', color: '#10B981', label: 'Sapo Pixel' },
  { id: 'arcade-panda', emoji: '🐼', color: '#E5E7EB', label: 'Panda Arcade' },
  { id: 'laser-tiger', emoji: '🐯', color: '#F59E0B', label: 'Tigre Laser' },
  { id: 'turbo-owl', emoji: '🦉', color: '#A78BFA', label: 'Coruja Turbo' },
  { id: 'robo', emoji: '🤖', color: '#06B6D4', label: 'Robô' },
  { id: 'alien', emoji: '👾', color: '#8B5CF6', label: 'Alien' },
  { id: 'ghost', emoji: '👻', color: '#CBD5E1', label: 'Fantasma' },
  { id: 'dragon', emoji: '🐲', color: '#22C55E', label: 'Dragão' },
  { id: 'unicorn', emoji: '🦄', color: '#F472B6', label: 'Unicórnio' },
  { id: 'octopus', emoji: '🐙', color: '#EF4444', label: 'Polvo' },
  // id mantido por compatibilidade com perfis salvos; 🦫 (Emoji 13) não renderiza no Windows 10/Android antigo.
  { id: 'capybara', emoji: '🐻', color: '#B45309', label: 'Urso' },
  { id: 'penguin', emoji: '🐧', color: '#38BDF8', label: 'Pinguim' },
  { id: 'monkey', emoji: '🐵', color: '#D97706', label: 'Macaco' },
  { id: 'shark', emoji: '🦈', color: '#0EA5E9', label: 'Tubarão' },
];

export function getAvatar(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
