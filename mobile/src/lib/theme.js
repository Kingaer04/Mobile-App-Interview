export const colors = {
  primary: '#D7263D',
  primaryDark: '#A61B2E',
  bg: '#F4F5F7',
  card: '#FFFFFF',
  text: '#1B1F24',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#15803D',
};

export const CATEGORY_COLORS = {
  accident: '#E67E22',
  fighting: '#8E44AD',
  rioting: '#C0392B',
  fire: '#E74C3C',
  robbery: '#2C3E50',
  flood: '#2980B9',
  medical: '#16A085',
  other: '#7F8C8D',
};

export const categoryColor = (slug) => CATEGORY_COLORS[slug] || colors.muted;

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
