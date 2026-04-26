import { useAppStore } from '../store/app-store';
import { getColors } from '../utils/theme';

/** Returns dynamic colours that respond to theme + accent changes. */
export function useTheme() {
  const theme  = useAppStore(s => s.theme);
  const accent = useAppStore(s => s.accent);
  return { C: getColors(theme, accent), theme, accent };
}
