import { AppShell } from '../src/components/AppShell';
import { TryMeScreen } from '../src/features/tryon/TryMeScreen';
export default function TryMePage() {
  return <AppShell active="tryme"><TryMeScreen /></AppShell>;
}
