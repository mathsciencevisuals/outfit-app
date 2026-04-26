import { AppShell } from '../src/components/AppShell';
import { RecommendationsScreen } from '../src/features/recommendations/RecommendationsScreen';
export default function RecommendationsPage() {
  return <AppShell active="recommendations"><RecommendationsScreen /></AppShell>;
}
