import { formatPrice } from '../../utils/currency';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { InfoRow } from '../../components/InfoRow';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import { Colors, FontSize, FontWeight, Spacing } from '../../utils/theme';

// ─── Register form ────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [name,        setName]        = useState('');
  const [url,         setUrl]         = useState('');
  const [region,      setRegion]      = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleRegister = useCallback(async () => {
    if (!name.trim() || !url.trim() || !region.trim()) {
      Alert.alert('Required fields', 'Shop name, URL, and region are required.');
      return;
    }
    setLoading(true);
    try {
      await mobileApi.merchantRegister({ name: name.trim(), url: url.trim(), region: region.trim(), description: description.trim() || undefined });
      Alert.alert('Welcome!', 'Your shop has been registered. You are now a FitMe Merchant.');
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }, [name, url, region, description, onSuccess]);

  return (
    <Screen scroll>
      <SectionCard title="Become a FitMe Seller" subtitle="List your local shop's inventory and reach college shoppers near you.">
        <Text style={styles.label}>Shop name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Riya's Boutique" />

        <Text style={styles.label}>Shop website / Instagram URL *</Text>
        <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://..." autoCapitalize="none" keyboardType="url" />

        <Text style={styles.label}>Region / City *</Text>
        <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="e.g. Mumbai, Delhi, Bangalore" />

        <Text style={styles.label}>Short description</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={description}
          onChangeText={setDescription}
          placeholder="What do you sell? Ethnic wear, western fashion…"
          multiline
          numberOfLines={3}
        />

        <PrimaryButton onPress={handleRegister}>
          Register my shop
        </PrimaryButton>
      </SectionCard>
      <LoadingOverlay visible={loading} message="Registering your shop…" />
    </Screen>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function MerchantDashboard() {
  const { data: shop, loading, error, refetch } = useAsyncResource(
    () => mobileApi.merchantShop(), []
  );
  const { data: analytics } = useAsyncResource(
    () => mobileApi.merchantAnalytics(), []
  );

  if (loading) return <Screen><EmptyState icon="⏳" title="Loading your shop…" /></Screen>;
  if (error || !shop) return (
    <Screen>
      <EmptyState icon="⚠️" title="Could not load shop" subtitle={error ?? undefined} action="Retry" onAction={refetch} />
    </Screen>
  );

  return (
    <Screen scroll>
      {/* Analytics */}
      {analytics && (
        <SectionCard title="Shop overview">
          <InfoRow label="Products"     value={String(analytics.productCount)} />
          <InfoRow label="Listings"     value={String(analytics.offerCount)} />
          <InfoRow label="Try-ons"      value={String(analytics.tryOnCount)} />
          <InfoRow label="Completed"    value={String(analytics.completedTryOns)} />
          <InfoRow label="Conversion"   value={`${analytics.conversionRate}%`} last />
        </SectionCard>
      )}

      {/* Shop profile */}
      <SectionCard title={shop.name} subtitle={shop.description ?? undefined}>
        <InfoRow label="URL"    value={shop.url} />
        <InfoRow label="Region" value={shop.region} last />
      </SectionCard>

      {/* Inventory */}
      <SectionCard title="Your listings" subtitle={`${shop.inventoryOffers.length} active offers`}>
        {shop.inventoryOffers.length === 0 ? (
          <EmptyState icon="📦" title="No listings yet" subtitle="Add products via the API or ask your admin to onboard inventory." />
        ) : (
          shop.inventoryOffers.map((offer, i) => (
            <View key={offer.id} style={[styles.offerRow, i < shop.inventoryOffers.length - 1 && styles.offerDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerName} numberOfLines={1}>
                  {offer.variant?.product?.name ?? 'Product'}
                </Text>
                <Text style={styles.offerMeta}>
                  {formatPrice(offer.price)} · Stock: {offer.stock}
                </Text>
              </View>
            </View>
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function MerchantPortalScreen() {
  const userRole = useAppStore(s => s.userRole);
  const [registered, setRegistered] = useState(false);

  const isMerchant = userRole === 'MERCHANT' || userRole === 'ADMIN' || userRole === 'OPERATOR';

  if (!isMerchant && !registered) {
    return <RegisterForm onSuccess={() => setRegistered(true)} />;
  }

  return <MerchantDashboard />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  label:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: 4, marginTop: Spacing.sm },
  input:      { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: Spacing.sm, paddingVertical: 10, fontSize: FontSize.sm, color: Colors.textPrimary, backgroundColor: Colors.surface },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  offerRow:   { paddingVertical: Spacing.sm },
  offerDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  offerName:  { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  offerMeta:  { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});
