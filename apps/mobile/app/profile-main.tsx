import { AppShell } from '../src/components/AppShell';
import { ProfileScreen } from '../src/features/profile/ProfileScreen';
export default function ProfileMainPage() {
  return <AppShell active="profile"><ProfileScreen mode="main" /></AppShell>;
}
