import { AppShell } from '../src/components/AppShell';
import { SavedLooksScreen } from '../src/features/saved/SavedLooksScreen';
export default function SavedLooksPage() {
  return <AppShell active="saved"><SavedLooksScreen /></AppShell>;
}
