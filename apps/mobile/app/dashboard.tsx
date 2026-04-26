import { AppShell } from '../src/components/AppShell';
import { DashboardScreen } from '../src/features/dashboard/DashboardScreen';
export default function DashboardPage() {
  return <AppShell active="dashboard"><DashboardScreen /></AppShell>;
}
