import { useCallback, useState } from 'react';
import {
  Alert, StyleSheet, Switch, Text, View,
} from 'react-native';

import { EmptyState }    from '../../components/EmptyState';
import { Screen }        from '../../components/Screen';
import { SectionCard }   from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi }     from '../../services/api';
import { Colors, FontSize, FontWeight, Spacing } from '../../utils/theme';

export function AdminTryOnScreen() {
  const { data: configs, loading, error, refetch } = useAsyncResource(
    () => mobileApi.adminListProviderConfigs(),
    [],
  );

  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = useCallback(async (config: any) => {
    setToggling(config.provider);
    try {
      await mobileApi.adminUpdateProviderConfig(config.provider, {
        displayName: config.displayName ?? config.provider,
        isEnabled:   !config.isEnabled,
        baseUrl:     config.baseUrl,
        apiKeyHint:  config.apiKeyHint,
      });
      refetch();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setToggling(null);
    }
  }, [refetch]);

  if (loading) {
    return (
      <Screen>
        <SectionCard><Text style={styles.loadingText}>Loading provider configs…</Text></SectionCard>
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
      <Text style={styles.pageTitle}>Try-On Providers</Text>
      <Text style={styles.subtitle}>Enable or disable AI try-on provider integrations.</Text>

      <SectionCard title="Provider Configs">
        {!configs?.length ? (
          <Text style={styles.emptyText}>No provider configurations found.</Text>
        ) : (
          configs.map((config: any, idx: number) => (
            <View key={config.provider}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{config.displayName ?? config.provider}</Text>
                  <Text style={styles.rowSub}>
                    {config.provider}
                    {config.baseUrl ? ` · ${config.baseUrl}` : ''}
                  </Text>
                  {config.apiKeyHint ? (
                    <Text style={styles.rowHint}>Key: {config.apiKeyHint}</Text>
                  ) : null}
                </View>
                <View style={styles.switchWrap}>
                  <Text style={[styles.statusText, { color: config.isEnabled ? Colors.success : Colors.textMuted }]}>
                    {config.isEnabled ? 'On' : 'Off'}
                  </Text>
                  <Switch
                    value={config.isEnabled ?? false}
                    onValueChange={() => handleToggle(config)}
                    disabled={toggling === config.provider}
                    trackColor={{ true: Colors.primary }}
                  />
                </View>
              </View>
            </View>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg },
  pageTitle:   { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, paddingTop: Spacing.md },
  subtitle:    { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  emptyText:   { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', padding: Spacing.md },
  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  rowInfo:     { flex: 1, gap: 2 },
  rowTitle:    { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  rowSub:      { fontSize: FontSize.xs, color: Colors.textMuted },
  rowHint:     { fontSize: FontSize.xs, color: Colors.textSecondary },
  divider:     { height: 1, backgroundColor: Colors.border },
  switchWrap:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  statusText:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, width: 20, textAlign: 'right' },
});
