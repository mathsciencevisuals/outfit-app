import { useCallback, useState } from 'react';
import {
  Alert, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { EmptyState }    from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen }        from '../../components/Screen';
import { SectionCard }   from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi }     from '../../services/api';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

export function AdminRewardsScreen() {
  const { data: users, loading, error, refetch } = useAsyncResource(
    () => mobileApi.adminListUsers(),
    [],
  );

  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount]                 = useState('');
  const [reason, setReason]                 = useState('');
  const [saving, setSaving]                 = useState(false);
  const [search, setSearch]                 = useState('');

  const handleAdjust = useCallback(async () => {
    if (!selectedUserId) { Alert.alert('Validation', 'Please select a user.'); return; }
    const pts = parseInt(amount, 10);
    if (!pts || isNaN(pts)) { Alert.alert('Validation', 'Enter a non-zero integer amount.'); return; }
    if (!reason.trim()) { Alert.alert('Validation', 'Reason is required.'); return; }

    setSaving(true);
    try {
      await mobileApi.adminAdjustRewards(selectedUserId, pts, reason.trim());
      Alert.alert('Done', `${pts > 0 ? '+' : ''}${pts} points applied.`);
      setAmount('');
      setReason('');
      setSelectedUserId('');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Adjustment failed.');
    } finally {
      setSaving(false);
    }
  }, [selectedUserId, amount, reason]);

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

  const filtered = (users ?? []).filter((u: any) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.email?.toLowerCase().includes(q) ||
      u.profile?.firstName?.toLowerCase().includes(q) ||
      u.profile?.lastName?.toLowerCase().includes(q)
    );
  });

  const selectedUser = (users ?? []).find((u: any) => u.id === selectedUserId);

  return (
    <Screen scroll>
      <Text style={styles.pageTitle}>Rewards Adjustment</Text>
      <Text style={styles.subtitle}>Manually add or deduct points for a user.</Text>

      {/* ── User picker ── */}
      <SectionCard title="Select User">
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email…"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
        {selectedUser && (
          <View style={styles.selectedBanner}>
            <Text style={styles.selectedLabel}>
              Selected: {selectedUser.profile?.firstName ?? ''} {selectedUser.profile?.lastName ?? ''} ({selectedUser.email})
            </Text>
            <Pressable onPress={() => setSelectedUserId('')}>
              <Text style={styles.clearBtn}>Clear</Text>
            </Pressable>
          </View>
        )}
        {!selectedUser && (
          filtered.slice(0, 10).map((u: any, idx: number) => (
            <View key={u.id}>
              {idx > 0 && <View style={styles.divider} />}
              <Pressable
                style={[styles.userRow, selectedUserId === u.id && styles.userRowActive]}
                onPress={() => { setSelectedUserId(u.id); setSearch(''); }}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {u.profile?.firstName ?? ''} {u.profile?.lastName ?? ''}
                    {!u.profile?.firstName && !u.profile?.lastName ? u.email : ''}
                  </Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                </View>
                <View style={[styles.roleBadge, roleColor(u.role)]}>
                  <Text style={styles.roleText}>{u.role}</Text>
                </View>
              </Pressable>
            </View>
          ))
        )}
        {!selectedUser && !filtered.length && (
          <Text style={styles.emptyText}>No users found.</Text>
        )}
      </SectionCard>

      {/* ── Adjustment form ── */}
      <SectionCard title="Adjustment">
        <View style={styles.formGroup}>
          <Text style={styles.label}>Points (positive to add, negative to deduct)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 100 or -50"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Reason *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={reason}
            onChangeText={setReason}
            placeholder="Why are points being adjusted?"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>
        <PrimaryButton onPress={handleAdjust} loading={saving}>
          Apply Adjustment
        </PrimaryButton>
      </SectionCard>
    </Screen>
  );
}

function roleColor(role: string) {
  switch (role) {
    case 'ADMIN':    return { backgroundColor: Colors.errorDim };
    case 'OPERATOR': return { backgroundColor: Colors.warningDim };
    case 'MERCHANT': return { backgroundColor: Colors.primaryDim };
    default:         return { backgroundColor: Colors.surface2 };
  }
}

const styles = StyleSheet.create({
  loadingText:    { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg },
  pageTitle:      { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, paddingTop: Spacing.md },
  subtitle:       { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  searchInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: FontSize.sm, color: Colors.textPrimary, backgroundColor: Colors.bg,
    marginBottom: Spacing.sm,
  },
  selectedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, backgroundColor: Colors.primaryDim, borderRadius: Radius.sm, paddingHorizontal: Spacing.md },
  selectedLabel:  { flex: 1, fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  clearBtn:       { fontSize: FontSize.sm, color: Colors.error, fontWeight: FontWeight.semibold, marginLeft: Spacing.sm },
  userRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  userRowActive:  { backgroundColor: Colors.primaryDim, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm },
  userInfo:       { flex: 1 },
  userName:       { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  userEmail:      { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  roleBadge:      { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  roleText:       { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary, letterSpacing: 0.5 },
  divider:        { height: 1, backgroundColor: Colors.border },
  emptyText:      { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.md },
  formGroup:      { marginBottom: Spacing.md },
  label:          { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4, fontWeight: FontWeight.medium },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: FontSize.base, color: Colors.textPrimary, backgroundColor: Colors.bg,
  },
  textarea:       { minHeight: 72, textAlignVertical: 'top' },
});
