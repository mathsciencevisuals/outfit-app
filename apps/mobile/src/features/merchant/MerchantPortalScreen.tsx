import * as ImagePicker from 'expo-image-picker';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState } from '../../components/EmptyState';
import { InfoRow } from '../../components/InfoRow';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionCard } from '../../components/SectionCard';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { mobileApi } from '../../services/api';
import { useAppStore } from '../../store/app-store';
import { formatPrice } from '../../utils/currency';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../../utils/theme';

const CATEGORIES = ['Kurta', 'Top', 'Dress', 'Bottom', 'Footwear', 'Accessory', 'Outerwear'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

function imageMime(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [region, setRegion] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = useCallback(async () => {
    if (!name.trim() || !url.trim() || !region.trim()) {
      Alert.alert('Required fields', 'Shop name, URL, and city are required.');
      return;
    }
    setLoading(true);
    try {
      await mobileApi.merchantRegister({
        name: name.trim(),
        url: url.trim(),
        region: region.trim(),
        description: description.trim() || undefined,
      });
      Alert.alert('Shop registered', 'Now upload your first garment listing.');
      onSuccess();
    } catch (err) {
      Alert.alert('Registration failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [description, name, onSuccess, region, url]);

  return (
    <Screen scroll>
      <SectionCard title="Register your shop" subtitle="Create a simple boutique profile before publishing garments.">
        <Text style={styles.label}>Shop name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Riya's Boutique" />

        <Text style={styles.label}>Website or Instagram *</Text>
        <TextInput style={styles.input} value={url} onChangeText={setUrl} placeholder="https://instagram.com/..." autoCapitalize="none" keyboardType="url" />

        <Text style={styles.label}>Location *</Text>
        <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="Mumbai, Bandra" />

        <Text style={styles.label}>What do you sell?</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={description}
          onChangeText={setDescription}
          placeholder="Ethnic wear, college fashion, festive outfits..."
          multiline
          numberOfLines={3}
        />

        <PrimaryButton onPress={handleRegister}>Register shop</PrimaryButton>
      </SectionCard>

      <MonetizationSection />
      <LoadingOverlay visible={loading} message="Registering your shop..." />
    </Screen>
  );
}

function ListingForm({
  shopUrl,
  defaultLocation,
  onPublished,
}: {
  shopUrl: string;
  defaultLocation: string;
  onPublished: () => void;
}) {
  const userId = useAppStore((s) => s.userId);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState('');
  const [sizes, setSizes] = useState<string[]>(['M']);
  const [location, setLocation] = useState(defaultLocation);
  const [color, setColor] = useState('');
  const [publishing, setPublishing] = useState(false);

  const stock = useMemo(() => Math.max(sizes.length, 1), [sizes.length]);

  const pickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo access needed', 'Please allow photo access to upload a garment.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const toggleSize = (size: string) => {
    setSizes((current) =>
      current.includes(size)
        ? current.filter((item) => item !== size)
        : [...current, size]
    );
  };

  const resetForm = () => {
    setPhotoUri(null);
    setTitle('');
    setCategory(CATEGORIES[0]);
    setPrice('');
    setSizes(['M']);
    setLocation(defaultLocation);
    setColor('');
  };

  const publish = useCallback(async () => {
    const numericPrice = Number(price);
    if (!photoUri || !title.trim() || !category || !numericPrice || !location.trim() || sizes.length === 0) {
      Alert.alert('Complete listing', 'Photo, title, category, price, size availability, and location are required.');
      return;
    }

    setPublishing(true);
    try {
      const mimeType = imageMime(photoUri);
      const session = await mobileApi.createUploadSession(userId, mimeType, 'merchant-garment');
      const upload = await mobileApi.uploadToSession(session.uploadPath, userId, photoUri, mimeType) as { publicUrl?: string };
      const imageUrl = upload.publicUrl ?? session.upload.publicUrl;

      await mobileApi.merchantPublishListing({
        title: title.trim(),
        category,
        price: numericPrice,
        sizes,
        location: location.trim(),
        imageUrl,
        color: color.trim() || undefined,
        externalUrl: shopUrl,
        stock,
        currency: 'INR',
      });
      Alert.alert('Listing published', 'Your garment is now available for virtual try-ons.');
      resetForm();
      onPublished();
    } catch (err) {
      Alert.alert('Publish failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setPublishing(false);
    }
  }, [category, color, location, onPublished, photoUri, price, shopUrl, sizes, stock, title, userId]);

  return (
    <SectionCard title="Publish a garment" subtitle="Add the details shoppers need before trying it virtually.">
      <Pressable style={styles.photoPicker} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
        ) : (
          <View style={styles.photoEmpty}>
            <Text style={styles.photoIcon}>+</Text>
            <Text style={styles.photoText}>Upload garment photo</Text>
          </View>
        )}
      </Pressable>

      <Text style={styles.label}>Garment title *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Embroidered cotton kurta" />

      <Text style={styles.label}>Category *</Text>
      <View style={styles.chipWrap}>
        {CATEGORIES.map((item) => (
          <Pressable key={item} style={[styles.chip, category === item && styles.chipActive]} onPress={() => setCategory(item)}>
            <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Price *</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="1299" keyboardType="numeric" />

      <Text style={styles.label}>Size availability *</Text>
      <View style={styles.chipWrap}>
        {SIZES.map((item) => {
          const active = sizes.includes(item);
          return (
            <Pressable key={item} style={[styles.sizeChip, active && styles.chipActive]} onPress={() => toggleSize(item)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Location *</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Shop area or city" />

      <Text style={styles.label}>Color</Text>
      <TextInput style={styles.input} value={color} onChangeText={setColor} placeholder="Pink, black, ivory..." />

      <PrimaryButton onPress={publish} disabled={publishing}>
        {publishing ? 'Publishing...' : 'Publish listing'}
      </PrimaryButton>
      <LoadingOverlay visible={publishing} message="Publishing listing..." />
    </SectionCard>
  );
}

function MerchantDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: shop, loading, error, refetch } = useAsyncResource(
    () => mobileApi.merchantShop(),
    [refreshKey]
  );
  const { data: analytics } = useAsyncResource(
    () => mobileApi.merchantAnalytics(),
    [refreshKey]
  );

  const refresh = () => {
    setRefreshKey((value) => value + 1);
    refetch();
  };

  if (loading) return <Screen><EmptyState icon="..." title="Loading your shop..." /></Screen>;
  if (error || !shop) return (
    <Screen>
      <EmptyState icon="!" title="Could not load shop" subtitle={error ?? undefined} action="Retry" onAction={refetch} />
    </Screen>
  );

  const offers = shop.inventoryOffers ?? [];

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Merchant portal</Text>
        <Text style={styles.title}>{shop.name}</Text>
        <Text style={styles.subtitle}>{shop.region}</Text>
      </View>

      {analytics ? (
        <SectionCard title="Dashboard" subtitle="Signals that lead to try-ons, shop visits, and paid growth.">
          <View style={styles.metricGrid}>
            <Metric label="Listings" value={analytics.offerCount} />
            <Metric label="Try-ons" value={analytics.tryOnCount} />
            <Metric label="Completed" value={analytics.completedTryOns} />
            <Metric label="Shop clicks" value={analytics.shopClicks ?? 0} />
            <Metric label="Leads" value={analytics.leadsGenerated ?? 0} />
            <Metric label="Conversion" value={`${analytics.conversionRate}%`} />
          </View>
        </SectionCard>
      ) : null}

      <ListingForm shopUrl={shop.url} defaultLocation={shop.region} onPublished={refresh} />

      <MonetizationSection />

      <SectionCard title="Your listings" subtitle={`${offers.length} active garment${offers.length === 1 ? '' : 's'}`}>
        {offers.length === 0 ? (
          <EmptyState
            icon="Upload"
            title="Upload your first garment to start receiving virtual try-ons."
            subtitle="Add a photo, price, sizes, and location. FitMe will make it available for try-on discovery."
            action="Upload garment"
            onAction={() => {}}
          />
        ) : (
          offers.map((offer, index) => {
            const imageUrl = offer.variant?.product?.imageUrl ?? offer.variant?.imageUrl ?? undefined;
            return (
              <View key={offer.id} style={[styles.offerRow, index < offers.length - 1 && styles.offerDivider]}>
                <View style={styles.offerThumb}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.offerImage} resizeMode="cover" />
                  ) : (
                    <Text style={styles.offerThumbText}>FitMe</Text>
                  )}
                </View>
                <View style={styles.offerCopy}>
                  <Text style={styles.offerName} numberOfLines={1}>{offer.variant?.product?.name ?? 'Garment'}</Text>
                  <Text style={styles.offerMeta}>
                    {formatPrice(offer.price)} | Stock {offer.stock}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </SectionCard>

      {(analytics?.topTriedGarments ?? []).length > 0 ? (
        <SectionCard title="Top tried garments">
          {(analytics?.topTriedGarments ?? []).map((item) => (
            <InfoRow key={item.variantId} label={item.name} value={`${item.tryOns} try-ons`} />
          ))}
        </SectionCard>
      ) : null}
    </Screen>
  );
}

function MonetizationSection() {
  return (
    <SectionCard title="Growth options" subtitle="Start free, then pay only when promotion or qualified leads matter.">
      <View style={styles.planGrid}>
        <Plan title="Free trial" subtitle="Publish starter listings and test demand." />
        <Plan title="₹500/month" subtitle="Promoted listing plan for more visibility." />
        <Plan title="₹50/lead" subtitle="Pay per qualified shopper lead." />
        <Plan title="Sponsored" subtitle="Optional placement in Discover and recommendations." />
      </View>
    </SectionCard>
  );
}

function Plan({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.planCard}>
      <Text style={styles.planTitle}>{title}</Text>
      <Text style={styles.planSubtitle}>{subtitle}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function MerchantPortalScreen() {
  const userRole = useAppStore(s => s.userRole);
  const [registered, setRegistered] = useState(false);
  const isMerchant = userRole === 'MERCHANT' || userRole === 'ADMIN' || userRole === 'OPERATOR';

  if (!isMerchant && !registered) {
    return <RegisterForm onSuccess={() => setRegistered(true)} />;
  }

  return <MerchantDashboard />;
}

const styles = StyleSheet.create({
  header: { gap: Spacing.xs },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  photoPicker: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoPreview: { width: '100%', height: '100%' },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  photoIcon: { fontSize: 34, color: Colors.primary, fontWeight: FontWeight.bold },
  photoText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  sizeChip: {
    minWidth: 44,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  chipTextActive: { color: Colors.white },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metricCard: {
    width: '48%',
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    padding: Spacing.md,
    gap: 3,
    ...Shadow.sm,
  },
  metricValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary },
  metricLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  planGrid: { gap: Spacing.sm },
  planCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface2,
    padding: Spacing.md,
  },
  planTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  planSubtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  offerRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center' },
  offerDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  offerThumb: {
    width: 54,
    height: 70,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerImage: { width: '100%', height: '100%' },
  offerThumbText: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.bold },
  offerCopy: { flex: 1 },
  offerName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  offerMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});
