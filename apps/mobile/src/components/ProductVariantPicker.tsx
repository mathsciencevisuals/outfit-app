import { formatPrice } from '../utils/currency';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '../utils/theme';
import type { Product, ProductVariant } from '../types';

interface ProductVariantPickerProps {
  products: Product[];
  selectedVariant: ProductVariant | undefined;
  selectedProduct: Product | undefined;
  onSelect: (product: Product, variant: ProductVariant) => void;
}

export function ProductVariantPicker({
  products,
  selectedVariant,
  selectedProduct,
  onSelect,
}: ProductVariantPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select garment to try on</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {products.map((product) =>
          product.variants.map((variant) => {
            const isSelected =
              selectedVariant?.id === variant.id &&
              selectedProduct?.id === product.id;
            return (
              <Pressable
                key={`${product.id}-${variant.id}`}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => onSelect(product, variant)}
              >
                {variant.imageUrl ? (
                  <Image
                    source={{ uri: variant.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Text style={styles.placeholderText}>👕</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.variantMeta} numberOfLines={1}>
                    {variant.color} · {variant.size}
                  </Text>
                  <Text style={styles.price}>
                    {formatPrice(variant.price, variant.currency)}
                  </Text>
                </View>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
                {!variant.inStock && (
                  <View style={styles.outOfStock}>
                    <Text style={styles.outOfStockText}>Out of stock</Text>
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Colour swatches for selected product */}
      {selectedProduct && selectedProduct.variants.length > 1 && (
        <View style={styles.swatchRow}>
          <Text style={styles.swatchLabel}>Colours:</Text>
          {selectedProduct.variants.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => onSelect(selectedProduct, v)}
              style={[
                styles.swatch,
                { backgroundColor: v.colorHex ?? Colors.surface3 },
                selectedVariant?.id === v.id && styles.swatchActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scroll:       { gap: Spacing.sm, paddingVertical: Spacing.xs },
  card: {
    width: 120,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardSelected: { borderColor: Colors.primary, borderWidth: 2 },
  image: { width: '100%', height: 130, backgroundColor: Colors.surface2 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 32 },
  info: { padding: Spacing.xs + 2, gap: 2 },
  productName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  variantMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  price: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },
  checkmark: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText:  { color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold },
  outOfStock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 3,
    alignItems: 'center',
  },
  outOfStockText: { fontSize: FontSize.xs, color: Colors.white },
  swatchRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  swatchLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  swatchActive: { borderWidth: 2.5, borderColor: Colors.primary },
});
