import { Platform } from 'react-native';

export const colors = {
  background: '#090d16',
  surface: '#0f172a',
  surfaceRaised: '#141e33',
  border: '#253149',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#10b981',
  accentSoft: 'rgba(16, 185, 129, 0.14)',
  danger: '#fb7185',
  dangerSoft: 'rgba(244, 63, 94, 0.14)',
  warning: '#fbbf24',
  warningSoft: 'rgba(245, 158, 11, 0.14)',
  info: '#38bdf8',
};

export const shadows = Platform.select({
  web: { boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)' },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
});
