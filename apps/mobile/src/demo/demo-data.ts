import type {
  Campaign,
  FitProfileResponse,
  FitResult,
  InventoryOffer,
  Product,
  ProductVariant,
  Recommendation,
  RewardWallet,
  SavedLook,
  SessionResponse,
  Shop,
  ShopComparison,
  TryOnRequest,
  UploadAsset,
  UserProfile
} from "../types/api";

const image = (label: string, background: string, foreground = "f8fafc", width = 720, height = 960) =>
  `https://placehold.co/${width}x${height}/${background}/${foreground}.png?text=${encodeURIComponent(label)}`;

const portrait = (label: string, background: string) => image(label, background, "f8fafc", 960, 1280);

const demoShops: Shop[] = [
  { id: "shop-myntra", name: "Myntra Demo", region: "IN", url: "https://demo.myntra.example" },
  { id: "shop-ajio", name: "Ajio Demo", region: "IN", url: "https://demo.ajio.example" },
  { id: "shop-nykaa", name: "Nykaa Fashion Demo", region: "IN", url: "https://demo.nykaafashion.example" }
];

function productVariant(productId: string, id: string, sizeLabel: string, color: string, price: number, imageUrl: string): ProductVariant {
  return {
    id,
    sizeLabel,
    color,
    price,
    currency: "INR",
    imageUrl,
    inventoryOffers: []
  };
}

const productCatalog: Product[] = [
  {
    id: "product-bomber",
    name: "Mesh Layer Bomber",
    category: "outerwear",
    baseColor: "black",
    secondaryColors: ["silver"],
    styleTags: ["streetwear", "trend", "night"],
    description: "A cropped bomber for cyber-core and late-night campus looks.",
    brand: { name: "Northline" },
    imageUrl: image("Mesh Layer Bomber", "1f2937"),
    occasionTags: ["streetwear", "date", "fest"],
    variants: [
      productVariant("product-bomber", "variant-bomber-s", "S", "black", 1799, image("Bomber S", "1f2937")),
      productVariant("product-bomber", "variant-bomber-m", "M", "black", 1899, image("Bomber M", "1f2937")),
      productVariant("product-bomber", "variant-bomber-l", "L", "black", 1999, image("Bomber L", "1f2937"))
    ]
  },
  {
    id: "product-denim",
    name: "Studio Denim Straight",
    category: "bottoms",
    baseColor: "indigo",
    secondaryColors: ["navy"],
    styleTags: ["minimal", "college", "streetwear"],
    description: "Straight-fit denim tuned for sneaker and boot pairings.",
    brand: { name: "Atelier Mono" },
    imageUrl: image("Studio Denim Straight", "2563eb"),
    occasionTags: ["casual", "college", "streetwear"],
    variants: [
      productVariant("product-denim", "variant-denim-s", "S", "indigo", 1499, image("Denim S", "2563eb")),
      productVariant("product-denim", "variant-denim-m", "M", "indigo", 1599, image("Denim M", "2563eb")),
      productVariant("product-denim", "variant-denim-l", "L", "indigo", 1699, image("Denim L", "2563eb"))
    ]
  },
  {
    id: "product-knit",
    name: "City Knit Polo",
    category: "tops",
    baseColor: "cream",
    secondaryColors: ["camel"],
    styleTags: ["smart", "minimal", "date"],
    description: "A polished knit polo for campus-smart and interview-ready looks.",
    brand: { name: "Northline" },
    imageUrl: image("City Knit Polo", "f1e7d0", "111827"),
    occasionTags: ["date", "college", "interview"],
    variants: [
      productVariant("product-knit", "variant-knit-s", "S", "cream", 1399, image("Knit Polo S", "f1e7d0", "111827")),
      productVariant("product-knit", "variant-knit-m", "M", "cream", 1499, image("Knit Polo M", "f1e7d0", "111827")),
      productVariant("product-knit", "variant-knit-l", "L", "cream", 1599, image("Knit Polo L", "f1e7d0", "111827"))
    ]
  },
  {
    id: "product-hoodie",
    name: "Recovery Zip Hoodie",
    category: "tops",
    baseColor: "gray",
    secondaryColors: ["black"],
    styleTags: ["sport", "casual", "trend"],
    description: "Soft zip hoodie built for coffee runs and sporty day looks.",
    brand: { name: "Kinetic Run" },
    imageUrl: image("Recovery Zip Hoodie", "6b7280"),
    occasionTags: ["casual", "college"],
    variants: [
      productVariant("product-hoodie", "variant-hoodie-s", "S", "gray", 1699, image("Hoodie S", "6b7280")),
      productVariant("product-hoodie", "variant-hoodie-m", "M", "gray", 1799, image("Hoodie M", "6b7280")),
      productVariant("product-hoodie", "variant-hoodie-l", "L", "gray", 1899, image("Hoodie L", "6b7280"))
    ]
  },
  {
    id: "product-blazer",
    name: "Interview Ready Blazer",
    category: "outerwear",
    baseColor: "charcoal",
    secondaryColors: ["black"],
    styleTags: ["formal", "smart", "interview"],
    description: "A sharp, structured blazer built for interview confidence.",
    brand: { name: "Atelier Mono" },
    imageUrl: image("Interview Ready Blazer", "374151"),
    occasionTags: ["formal", "interview", "date"],
    variants: [
      productVariant("product-blazer", "variant-blazer-s", "S", "charcoal", 2599, image("Blazer S", "374151")),
      productVariant("product-blazer", "variant-blazer-m", "M", "charcoal", 2699, image("Blazer M", "374151")),
      productVariant("product-blazer", "variant-blazer-l", "L", "charcoal", 2799, image("Blazer L", "374151"))
    ]
  },
  {
    id: "product-sneaker",
    name: "Canvas Sneaker",
    category: "footwear",
    baseColor: "white",
    secondaryColors: ["tan"],
    styleTags: ["college", "casual", "trend"],
    description: "Clean sneaker that keeps most looks wearable and budget friendly.",
    brand: { name: "Northline" },
    imageUrl: image("Canvas Sneaker", "e5e7eb", "111827"),
    occasionTags: ["casual", "college", "streetwear"],
    variants: [
      productVariant("product-sneaker", "variant-sneaker-40", "40", "white", 1299, image("Sneaker 40", "e5e7eb", "111827")),
      productVariant("product-sneaker", "variant-sneaker-41", "41", "white", 1399, image("Sneaker 41", "e5e7eb", "111827")),
      productVariant("product-sneaker", "variant-sneaker-42", "42", "white", 1499, image("Sneaker 42", "e5e7eb", "111827"))
    ]
  }
];

function createOffersForProduct(product: Product, variantIndex = 1): InventoryOffer[] {
  const variant = product.variants?.[variantIndex] ?? product.variants?.[0];
  if (!variant) {
    return [];
  }

  return [
    {
      id: `${product.id}-offer-myntra`,
      externalUrl: `${demoShops[0].url}/products/${product.id}`,
      stock: 8,
      price: (variant.price ?? 0) + 50,
      currency: "INR",
      shop: demoShops[0],
      variant: { ...variant, product }
    },
    {
      id: `${product.id}-offer-ajio`,
      externalUrl: `${demoShops[1].url}/products/${product.id}`,
      stock: 5,
      price: (variant.price ?? 0) + 120,
      currency: "INR",
      shop: demoShops[1],
      variant: { ...variant, product }
    },
    {
      id: `${product.id}-offer-nykaa`,
      externalUrl: `${demoShops[2].url}/products/${product.id}`,
      stock: 3,
      price: (variant.price ?? 0) + 180,
      currency: "INR",
      shop: demoShops[2],
      variant: { ...variant, product }
    }
  ];
}

const demoProducts: Product[] = productCatalog.map((product) => {
  const offers = createOffersForProduct(product);
  const variants = (product.variants ?? []).map((variant) => ({
    ...variant,
    inventoryOffers: offers.filter((offer) => offer.variant?.id === variant.id)
  }));
  return {
    ...product,
    variants,
    offerSummary: {
      offerCount: offers.length,
      shopCount: 3,
      lowestPrice: Math.min(...offers.map((offer) => offer.price)),
      highestPrice: Math.max(...offers.map((offer) => offer.price)),
      bestOffer: offers[0],
      availabilityLabel: "In stock across shops",
      badges: ["Best Price", "Available Now"]
    }
  };
});

const demoFitResult: FitResult = {
  userId: "demo-user",
  productId: "product-bomber",
  productName: "Mesh Layer Bomber",
  variantId: "variant-bomber-m",
  selectedSizeLabel: "M",
  fitPreference: "regular",
  recommendedSize: "M",
  fitLabel: "regular",
  confidenceScore: 0.92,
  fitScore: 91,
  issues: [],
  explanation: "Size M balances shoulder room and chest ease for the saved demo profile.",
  alternatives: [{ sizeLabel: "L", fitScore: 83, reason: "Try L if you want a more oversized drape." }],
  sizeComparisons: [
    {
      sizeLabel: "S",
      variantId: "variant-bomber-s",
      fitScore: 72,
      confidenceScore: 0.8,
      fitLabel: "slim",
      issues: [],
      explanation: "S runs closer through the chest and shoulder.",
      isRecommended: false,
      isSelected: false
    },
    {
      sizeLabel: "M",
      variantId: "variant-bomber-m",
      fitScore: 91,
      confidenceScore: 0.92,
      fitLabel: "regular",
      issues: [],
      explanation: "M gives the best balance of structure and comfort.",
      isRecommended: true,
      isSelected: true
    },
    {
      sizeLabel: "L",
      variantId: "variant-bomber-l",
      fitScore: 83,
      confidenceScore: 0.86,
      fitLabel: "relaxed",
      issues: [],
      explanation: "L works for a looser styling preference.",
      isRecommended: false,
      isSelected: false
    }
  ],
  measurementProfile: {
    fitPreference: "regular",
    providedMeasurements: ["height", "chest", "waist", "hips", "shoulder", "inseam"],
    relevantMeasurements: ["chest", "shoulder", "waist"],
    completenessScore: 0.9,
    guidance: "Measurements are strong enough for screenshot-ready fit confidence."
  },
  assessmentId: "demo-fit-assessment"
};

const demoRecommendations: Recommendation[] = demoProducts.map((product, index) => ({
  id: `demo-recommendation-${index + 1}`,
  productId: product.id,
  product,
  score: 94 - index * 4,
  explanation: [
    "Best fit for your saved measurements and current streetwear leaning.",
    "Matches your style DNA and keeps the price inside your current budget.",
    "Complements your preferred color palette and layered wardrobe.",
    "Trending now in the feed and pairs cleanly with your saved looks.",
    "Balances formal polish with wearable student styling.",
    "Easy add-on piece that keeps outfit confidence high."
  ][index] ?? "Strong screenshot-ready recommendation.",
  fitResult: demoFitResult,
  bestSizeLabel: demoFitResult.recommendedSize,
  bestFitLabel: demoFitResult.fitLabel,
  fitWarning: null,
  reasonTags: [["FIT"], ["STYLE"], ["COLOR"], ["TREND"], ["FIT", "STYLE"], ["COLOR", "TREND"]][index] ?? ["STYLE"],
  rankingBadges: [["Best Fit"], ["Style Match"], ["Color Match"], ["Trending"], ["Interview Ready"], ["Budget Friendly"]][index] ?? ["Worth Trying"],
  offerSummary: product.offerSummary,
  budgetLabel: "Under Rs. 2.8k"
}));

const demoSavedLooks: SavedLook[] = [
  {
    id: "saved-look-1",
    name: "Commute Layers",
    note: "Balanced smart-casual stack for weekday rotation.",
    isWishlist: false,
    items: demoProducts.slice(0, 3).map((product, index) => ({ id: `saved-look-1-item-${index + 1}`, productId: product.id, product })),
    offerSummary: demoProducts[0].offerSummary,
    recommendedProducts: [demoProducts[3], demoProducts[5]],
    occasionTags: ["college", "streetwear"]
  },
  {
    id: "saved-look-2",
    name: "Night Market Fit",
    note: "Saved from the try-on result for a moodier evening scene.",
    isWishlist: false,
    items: demoProducts.slice(0, 2).map((product, index) => ({ id: `saved-look-2-item-${index + 1}`, productId: product.id, product })),
    offerSummary: demoProducts[0].offerSummary,
    recommendedProducts: [demoProducts[5]],
    occasionTags: ["date", "fest"]
  },
  {
    id: "saved-look-3",
    name: "Liked Campus Edit",
    note: "Wishlist-backed pieces for campus and creator-style outfits.",
    isWishlist: true,
    items: demoProducts.slice(2, 4).map((product, index) => ({ id: `saved-look-3-item-${index + 1}`, productId: product.id, product })),
    offerSummary: demoProducts[2].offerSummary,
    recommendedProducts: [demoProducts[4]],
    occasionTags: ["college", "casual"]
  },
  {
    id: "saved-look-4",
    name: "Interview Ready Board",
    note: "Structured pieces for placement-day and formal styling.",
    isWishlist: false,
    items: [demoProducts[4], demoProducts[2]].map((product, index) => ({ id: `saved-look-4-item-${index + 1}`, productId: product.id, product })),
    offerSummary: demoProducts[4].offerSummary,
    recommendedProducts: [demoProducts[5]],
    occasionTags: ["interview", "formal"]
  }
];

const demoUploads: Record<string, UploadAsset> = {
  source: {
    id: "upload-source",
    key: "demo/source",
    mimeType: "image/png",
    bucket: "demo-assets",
    publicUrl: portrait("Demo Portrait", "312e81"),
    createdAt: "2026-04-26T00:00:00.000Z"
  },
  garment: {
    id: "upload-garment",
    key: "demo/garment",
    mimeType: "image/png",
    bucket: "demo-assets",
    publicUrl: portrait("Demo Garment", "0f766e"),
    createdAt: "2026-04-26T00:00:00.000Z"
  }
};

const demoTryOnRequest: TryOnRequest = {
  id: "demo-tryon-request",
  userId: "demo-user",
  variantId: "variant-bomber-m",
  provider: "demo-mode",
  imageUrl: demoUploads.source.publicUrl,
  garmentImageUrl: demoUploads.garment.publicUrl,
  sourceUploadId: demoUploads.source.id,
  garmentUploadId: demoUploads.garment.id,
  fitStyle: "balanced",
  comparisonLabel: "Cyberpunk City / Mesh Layer Bomber / M",
  status: "COMPLETED",
  statusMessage: "Demo try-on ready",
  requestedAt: "2026-04-26T00:00:00.000Z",
  processedAt: "2026-04-26T00:00:05.000Z",
  sourceUpload: demoUploads.source,
  garmentUpload: demoUploads.garment,
  result: {
    id: "demo-tryon-result",
    requestId: "demo-tryon-request",
    outputImageUrl: portrait("Demo Try-On Result", "be185d"),
    overlayImageUrl: portrait("Demo Overlay", "1d4ed8"),
    confidence: 0.9,
    summary: "Demo try-on result generated for screenshot mode.",
    metadata: {
      sceneVibe: "Cyberpunk City",
      fitStyle: "balanced",
      selectedColor: "black"
    }
  },
  variant: {
    ...(demoProducts[0].variants?.[1] ?? demoProducts[0].variants?.[0] ?? productVariant("product-bomber", "variant-bomber-m", "M", "black", 1899, image("Bomber M", "1f2937"))),
    product: demoProducts[0]
  }
};

const demoProfile: UserProfile = {
  id: "profile-demo",
  firstName: "Demo",
  lastName: "User",
  avatarUploadId: demoUploads.source.id,
  avatarUrl: portrait("Demo Avatar", "7c3aed"),
  gender: "female",
  age: 21,
  heightCm: 168,
  weightKg: 61,
  bodyShape: "athletic",
  fitPreference: "regular",
  preferredColors: ["black", "white", "olive", "blue"],
  avoidedColors: ["orange"],
  budgetMin: 1200,
  budgetMax: 2800,
  budgetLabel: "Under Rs. 2.8k",
  closetStatus: "ACTIVE",
  stylePreference: { preferredStyles: ["streetwear", "minimal", "smart", "sport"] },
  measurements: [
    {
      id: "measurement-demo",
      userId: "demo-user",
      chestCm: 91,
      waistCm: 74,
      hipsCm: 97,
      inseamCm: 79,
      shoulderCm: 42,
      footLengthCm: 25,
      source: "demo"
    }
  ],
  savedLooks: demoSavedLooks
};

const demoSession: SessionResponse = {
  user: {
    id: "demo-user",
    email: "demo@fitme.dev",
    role: "USER",
    profile: demoProfile
  }
};

const demoFitProfile: FitProfileResponse = {
  userId: "demo-user",
  fitPreference: "regular",
  completenessScore: 0.9,
  providedMeasurements: ["height", "chest", "waist", "hips", "inseam", "shoulder"],
  relevantMeasurements: ["chest", "shoulder", "waist"],
  guidance: "Demo measurements are complete enough for fit and screenshot flows.",
  profile: demoProfile,
  latestMeasurement: demoProfile.measurements?.[0] ?? null
};

const demoRewardWallet: RewardWallet = {
  id: "reward-wallet-demo",
  userId: "demo-user",
  balancePoints: 320,
  lifetimeEarned: 420,
  lifetimeSpent: 100,
  tierLabel: "Insider",
  createdAt: "2026-04-26T00:00:00.000Z",
  updatedAt: "2026-04-26T00:00:00.000Z"
};

const demoCampaigns: Campaign[] = [
  {
    id: "campaign-demo-campus",
    title: "Campus Casual Week",
    theme: "CAMPUS_CASUAL",
    status: "ACTIVE",
    description: "Student-first layers and budget looks for all-day campus wear.",
    budgetLabel: "Under 999",
    banners: [{ title: "Campus Casual", subtitle: "Back-to-class layers built for long days and fast outfit decisions." }],
    createdAt: "2026-04-26T00:00:00.000Z"
  }
];

function demoShopComparison(productId?: string): ShopComparison {
  const product = demoProducts.find((entry) => entry.id === productId) ?? demoProducts[0];
  const offers = createOffersForProduct(product);
  return {
    productId: product.id,
    productName: product.name,
    variantId: offers[0]?.variant?.id ?? null,
    recommendedSize: demoFitResult.recommendedSize,
    fitLabel: demoFitResult.fitLabel,
    offers,
    bestOffer: offers[0],
    lowestPrice: Math.min(...offers.map((offer) => offer.price)),
    highestPrice: Math.max(...offers.map((offer) => offer.price)),
    badges: ["Best Price", "Best Fit", "Available Now"],
    cheaperAlternative: demoProducts[5],
    bestFitAlternative: { product: demoProducts[0], fit: demoFitResult.fitLabel }
  };
}

export const demoData = {
  demoToken: "demo-mode-token",
  session: demoSession,
  profile: demoProfile,
  products: demoProducts,
  recommendations: demoRecommendations,
  savedLooks: demoSavedLooks,
  shops: demoShops,
  tryOnRequest: demoTryOnRequest,
  fitProfile: demoFitProfile,
  fitResult: demoFitResult,
  rewardWallet: demoRewardWallet,
  campaigns: demoCampaigns,
  shopComparison: demoShopComparison
};
