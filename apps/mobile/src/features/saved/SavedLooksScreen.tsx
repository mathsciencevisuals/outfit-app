import { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { EmptyState, ErrorState, LoadingState } from "../../components/StateCard";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { mobileApi } from "../../services/api";
import { useAppStore } from "../../store/app-store";
import { colors, radius, shadow } from "../../theme/design";
import type { Product, SavedLook } from "../../types/api";
import { Screen } from "../../components/Screen";
import { demoData } from "../../demo/demo-data";

function formatPriceRange(lowest?: number | null, highest?: number | null) {
  if (lowest != null && highest != null && lowest !== highest) {
    return `Rs. ${Math.round(lowest)} - Rs. ${Math.round(highest)}`;
  }
  if (lowest != null) {
    return `Rs. ${Math.round(lowest)}`;
  }
  return "Price pending";
}

function vibeTag(look: SavedLook) {
  return look.occasionTags?.[0] ?? (look.isWishlist ? "Liked" : "Saved fit");
}

export function SavedLooksScreen() {
  const router = useRouter();
  const userId = useAppStore((state) => state.userId);
  const { data, loading, error } = useAsyncResource(() => mobileApi.savedLooks(userId), [userId]);

  const looks = data ?? [];
  const savedFits = useMemo(() => looks.filter((look) => !look.isWishlist), [looks]);
  const likedLooks = useMemo(() => looks.filter((look) => Boolean(look.isWishlist)), [looks]);

  const likedProducts = useMemo(() => {
    const collection = new Map<string, Product>();
    likedLooks.forEach((look) => {
      (look.items ?? []).forEach((item) => {
        if (item.product?.id) {
          collection.set(item.product.id, item.product);
        }
      });
      (look.recommendedProducts ?? []).forEach((product) => {
        collection.set(product.id, product);
      });
    });
    return Array.from(collection.values());
  }, [likedLooks]);

  function lookImage(look: SavedLook, index: number) {
    return (
      look.items?.[0]?.product?.imageUrl ??
      look.recommendedProducts?.[0]?.imageUrl ??
      demoData.savedLooks[index]?.items?.[0]?.product?.imageUrl ??
      demoData.products[index % demoData.products.length]?.imageUrl ??
      null
    );
  }

  if (loading) {
    return (
      <Screen showProfileStrip={false}>
        <LoadingState title="Saved" subtitle="Loading your wardrobe and liked garment memory." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen showProfileStrip={false}>
        <ErrorState title="Saved" message="Saved looks could not be loaded." actionLabel="Feed" onRetry={() => router.push("/feed")} />
      </Screen>
    );
  }

  if (looks.length === 0) {
    return (
      <Screen showProfileStrip={false}>
        <EmptyState
          title="No looks saved yet"
          message="Save outfits after try-on or shopping to build your wardrobe memory."
          actionLabel="Try-On"
          onAction={() => router.push("/try-on")}
        />
      </Screen>
    );
  }

  return (
    <Screen showProfileStrip={false}>
      <View style={styles.shell}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>Saved</Text>
          <Text style={styles.title}>Your wardrobe</Text>
          <Text style={styles.subtitle}>
            Saved fits and liked garments stay grouped as a visual wardrobe so screenshots feel like a real account.
          </Text>
          <View style={styles.buttonRow}>
            <ActionButton label="Try another look" onPress={() => router.push("/try-on")} />
            <ActionButton label="Compare offers" variant="secondary" onPress={() => router.push("/retail")} />
          </View>
        </View>

        <SectionBlock
          title="Saved Fits"
          subtitle="Generated looks and wardrobe boards you can reopen or shop from."
          emptyTitle="No saved fits yet"
          emptyBody="Generate a try-on result or save a recommendation to populate your wardrobe."
        >
          <View style={styles.grid}>
            {savedFits.map((look, index) => (
              <WardrobeCard
                key={look.id}
                imageUri={lookImage(look, index)}
                name={look.name}
                itemCount={look.items?.length ?? 0}
                priceLabel={formatPriceRange(look.offerSummary?.lowestPrice, look.offerSummary?.highestPrice)}
                tag={vibeTag(look)}
                note={look.note ?? "Saved fit"}
                onPress={() => router.push("/retail")}
              />
            ))}
          </View>
        </SectionBlock>

        <SectionBlock
          title="Liked Garments"
          subtitle="Wishlist-backed pieces separated from complete looks, but still visual and shoppable."
          emptyTitle="No liked garments yet"
          emptyBody="Use the shopping screen to save products into your wishlist."
        >
          {likedProducts.length > 0 ? (
            <View style={styles.grid}>
              {likedProducts.map((product, index) => (
                <WardrobeCard
                  key={product.id}
                  imageUri={product.imageUrl ?? demoData.products[index % demoData.products.length]?.imageUrl ?? null}
                  name={product.name}
                  itemCount={1}
                  priceLabel={formatPriceRange(product.offerSummary?.lowestPrice, product.offerSummary?.highestPrice)}
                  tag={product.occasionTags?.[0] ?? product.styleTags?.[0] ?? "Liked"}
                  note={[product.brand?.name, product.category].filter(Boolean).join(" • ") || "Wishlist piece"}
                  onPress={() => router.push("/retail")}
                />
              ))}
            </View>
          ) : (
            <EmptyCopy title="No liked garments yet" body="Use the shopping screen to save products into your wishlist." />
          )}
        </SectionBlock>
      </View>
    </Screen>
  );
}

function SectionBlock({
  title,
  subtitle,
  emptyTitle,
  emptyBody,
  children
}: {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyBody: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      {hasChildren ? children : <EmptyCopy title={emptyTitle} body={emptyBody} />}
    </View>
  );
}

function WardrobeCard({
  imageUri,
  name,
  itemCount,
  priceLabel,
  tag,
  note,
  onPress
}: {
  imageUri: string | null;
  name: string;
  itemCount: number;
  priceLabel: string;
  tag: string;
  note: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wardrobeCard, pressed && styles.pressed]}>
      <View style={styles.wardrobeThumb}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.wardrobeImage} /> : null}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{tag}</Text>
        </View>
      </View>
      <View style={styles.wardrobeMeta}>
        <Text style={styles.wardrobeTitle}>{name}</Text>
        <Text style={styles.wardrobeNote}>{note}</Text>
        <View style={styles.metaRow}>
          <MetaChip label={`${itemCount} items`} />
          <MetaChip label={priceLabel} tone="warning" />
        </View>
      </View>
    </Pressable>
  );
}

function MetaChip({ label, tone = "default" }: { label: string; tone?: "default" | "warning" }) {
  return (
    <View style={[styles.metaChip, tone === "warning" && styles.metaChipWarning]}>
      <Text style={[styles.metaChipText, tone === "warning" && styles.metaChipTextWarning]}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = "primary"
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "primary" ? styles.actionButtonPrimary : styles.actionButtonSecondary,
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.actionButtonText, variant === "secondary" && styles.actionButtonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

function EmptyCopy({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 16
  },
  headerCard: {
    gap: 10,
    borderRadius: radius.xl,
    padding: 18,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  eyebrow: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  actionButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accentStrong
  },
  actionButtonSecondary: {
    backgroundColor: colors.panelMuted,
    borderColor: colors.lineStrong
  },
  actionButtonText: {
    color: colors.inkOnDark,
    fontSize: 13,
    fontWeight: "800"
  },
  actionButtonTextSecondary: {
    color: colors.ink
  },
  sectionCard: {
    gap: 12,
    borderRadius: radius.xl,
    padding: 18,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  sectionSubtitle: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  wardrobeCard: {
    width: "47.8%",
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  wardrobeThumb: {
    height: 132,
    overflow: "hidden",
    backgroundColor: colors.pageStrong
  },
  wardrobeImage: {
    width: "100%",
    height: "100%"
  },
  badge: {
    position: "absolute",
    left: 10,
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(18,23,40,0.78)"
  },
  badgeText: {
    color: colors.inkOnDark,
    fontSize: 11,
    fontWeight: "800"
  },
  wardrobeMeta: {
    gap: 6,
    padding: 12
  },
  wardrobeTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  wardrobeNote: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 17
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  metaChip: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft
  },
  metaChipWarning: {
    backgroundColor: colors.warningSoft
  },
  metaChipText: {
    color: colors.accentStrong,
    fontSize: 11,
    fontWeight: "800"
  },
  metaChipTextWarning: {
    color: colors.warning
  },
  emptyCard: {
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: colors.line
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  emptyBody: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }]
  }
});
