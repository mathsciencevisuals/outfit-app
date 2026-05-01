import { StyleSheet, Text, View } from 'react-native';

import { EmptyState }    from '../../components/EmptyState';
import { Screen }        from '../../components/Screen';
import { SectionCard }   from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi }     from '../../services/api';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN:    { bg: Colors.errorDim,   text: Colors.error },
  OPERATOR: { bg: Colors.warningDim, text: Colors.warning },
  USER:     { bg: Colors.primaryDim, text: Colors.primary },
  MERCHANT: { bg: Colors.successDim, text: Colors.success },
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function AdminUsersScreen() {
  const { data: users, loading, error, refetch } = useAsyncResource(
    () => mobileApi.adminListUsers(),
    [],
  );

  if (loading) {
    return (
      <Screen>
        <SectionCard><Text style={styles.loadingText}>Loading users…</Text></SectionCard>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <EmptyState icon="⚠️" title="Failed to load" subtitle={error} action="Retry" onAction={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.pageTitle}>Users ({users?.length ?? 0})</Text>

      <SectionCard title="All Users">
        {!users?.length ? (
          <Text style={styles.emptyText}>No users found.</Text>
        ) : (
          users.map((user: any, idx: number) => {
            const roleStyle = ROLE_COLORS[user.role] ?? ROLE_COLORS.USER;
            return (
              <View key={user.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.row}>
                  <View style={styles.rowInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed'}
                      </Text>
                      <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
                        <Text style={[styles.roleBadgeText, { color: roleStyle.text }]}>
                          {user.role ?? 'USER'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.rowEmail} numberOfLines={1}>{user.email ?? '—'}</Text>
                    <Text style={styles.rowSub}>Joined {formatDate(user.createdAt)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText:   { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg },
  pageTitle:     { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, paddingVertical: Spacing.md },
  emptyText:     { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.md },
  row:           { paddingVertical: Spacing.sm },
  rowInfo:       { flex: 1, gap: 2 },
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowTitle:      { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  rowEmail:      { fontSize: FontSize.sm, color: Colors.textSecondary },
  rowSub:        { fontSize: FontSize.xs, color: Colors.textMuted },
  divider:       { height: 1, backgroundColor: Colors.border },
  roleBadge:     { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  roleBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
