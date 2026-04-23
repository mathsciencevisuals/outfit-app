export type OccasionTag =
  | "casual"
  | "streetwear"
  | "formal"
  | "college"
  | "interview"
  | "date"
  | "fest";

function numericValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (value && typeof value === "object" && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  const cast = Number(value);
  return Number.isFinite(cast) ? cast : 0;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function inferOccasionTags(product: {
  category?: string;
  styleTags?: string[];
  name?: string;
  baseColor?: string;
  secondaryColors?: string[];
}): OccasionTag[] {
  const category = String(product.category ?? "").toLowerCase();
  const name = String(product.name ?? "").toLowerCase();
  const styleTags = (product.styleTags ?? []).map((tag) => tag.toLowerCase());
  const colors = [product.baseColor, ...(product.secondaryColors ?? [])].map((value) => String(value ?? "").toLowerCase());

  const tags: OccasionTag[] = [];

  if (styleTags.some((tag) => ["casual", "minimal", "outdoor", "sport"].includes(tag)) || category === "tops") {
    tags.push("casual");
  }
  if (styleTags.some((tag) => ["street", "streetwear", "sport", "technical"].includes(tag)) || category === "footwear") {
    tags.push("streetwear");
  }
  if (styleTags.some((tag) => ["tailored", "formal"].includes(tag)) || name.includes("blazer") || name.includes("trouser")) {
    tags.push("formal", "interview");
  }
  if (styleTags.some((tag) => ["smart", "minimal", "casual", "sport"].includes(tag))) {
    tags.push("college");
  }
  if (styleTags.some((tag) => ["elevated", "smart", "minimal"].includes(tag)) || colors.some((color) => ["black", "navy", "camel", "cream"].includes(color))) {
    tags.push("date");
  }
  if (styleTags.some((tag) => ["elevated", "street", "sport"].includes(tag)) || colors.some((color) => ["red", "forest", "blue"].includes(color))) {
    tags.push("fest");
  }

  return unique(tags);
}

export function serializeInventoryOffer(offer: any): any {
  if (!offer) {
    return null;
  }

  return {
    ...offer,
    price: numericValue(offer.price),
    shop: offer.shop
      ? {
          ...offer.shop
        }
      : offer.shop,
    variant: offer.variant
      ? {
          ...offer.variant,
          price: numericValue(offer.variant.price),
          product: offer.variant.product ? serializeProductCard(offer.variant.product) : offer.variant.product
        }
      : offer.variant
  };
}

export function collectProductOffers(product: any) {
  return (product?.variants ?? [])
    .flatMap((variant: any) => (variant.inventoryOffers ?? []).map((offer: any) => ({ ...offer, variant })))
    .map(serializeInventoryOffer)
    .filter(Boolean);
}

export function summarizeOffers(offers: any[]): any {
  const normalizedOffers: any[] = offers.map((offer: any) => serializeInventoryOffer(offer)).filter(Boolean);
  if (normalizedOffers.length === 0) {
    return {
      offerCount: 0,
      shopCount: 0,
      lowestPrice: null,
      highestPrice: null,
      bestOffer: null,
      availabilityLabel: "No live offers",
      badges: ["Unavailable"]
    };
  }

  const sorted = [...normalizedOffers].sort((left, right) => {
    const stockWeight = (right.stock > 0 ? 1 : 0) - (left.stock > 0 ? 1 : 0);
    if (stockWeight !== 0) {
      return stockWeight;
    }
    return left.price - right.price;
  });
  const prices = normalizedOffers.map((offer) => offer.price);
  const inStockCount = normalizedOffers.filter((offer) => offer.stock > 0).length;

  return {
    offerCount: normalizedOffers.length,
    shopCount: unique(normalizedOffers.map((offer) => offer.shop?.id).filter(Boolean)).length,
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
    bestOffer: sorted[0] ?? null,
    availabilityLabel:
      inStockCount === 0 ? "Out of stock" : inStockCount === normalizedOffers.length ? "In stock across shops" : "Limited stock",
    badges: [
      sorted[0] ? "Best Price" : null,
      inStockCount > 1 ? "Available Now" : inStockCount === 1 ? "Low Stock" : "Unavailable"
    ].filter(Boolean)
  };
}

export function representativePriceForProduct(product: any) {
  const offers = collectProductOffers(product);
  if (offers.length > 0) {
    return summarizeOffers(offers).lowestPrice ?? 0;
  }

  const variantPrices = (product?.variants ?? []).map((variant: any) => numericValue(variant.price)).filter(Boolean);
  return variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
}

export function serializeProductCard(product: any): any {
  const variants = (product?.variants ?? []).map((variant: any) => ({
    ...variant,
    price: numericValue(variant.price),
    inventoryOffers: (variant.inventoryOffers ?? []).map(serializeInventoryOffer).filter(Boolean),
    sizeChartEntries: variant.sizeChartEntries ?? []
  }));
  const offers = collectProductOffers({ ...product, variants });

  return {
    ...product,
    variants,
    occasionTags: inferOccasionTags(product),
    offerSummary: summarizeOffers(offers)
  };
}
