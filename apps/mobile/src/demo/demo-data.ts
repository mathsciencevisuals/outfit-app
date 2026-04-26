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
  { id: "shop-nykaa", name: "Nykaa Fashion Demo", region: "IN", url: "https://demo.nykaafashion.example" },
  { id: "shop-tata-cliq", name: "Tata CLiQ Demo", region: "IN", url: "https://demo.tatacliq.example" }
];

type ProductSeed = {
  id: string;
  name: string;
  category: string;
  baseColor: string;
  secondaryColors: string[];
  styleTags: string[];
  occasionTags: Product["occasionTags"];
  brand: string;
  description: string;
  background: string;
  foreground?: string;
  prices: [number, number, number];
};

function productVariant(seed: ProductSeed, id: string, sizeLabel: string, price: number, imageUrl: string): ProductVariant {
  return {
    id,
    sizeLabel,
    color: seed.baseColor,
    price,
    currency: "INR",
    imageUrl,
    inventoryOffers: []
  };
}

const productSeeds: ProductSeed[] = [
  {
    id: "product-bomber",
    name: "Mesh Layer Bomber",
    category: "jackets",
    baseColor: "black",
    secondaryColors: ["silver"],
    styleTags: ["streetwear", "trend", "night"],
    occasionTags: ["streetwear", "date", "fest"],
    brand: "Northline",
    description: "Cropped bomber for night-out layers and creator shots.",
    background: "1f2937",
    prices: [1799, 1899, 1999]
  },
  {
    id: "product-blazer",
    name: "Interview Ready Blazer",
    category: "jackets",
    baseColor: "charcoal",
    secondaryColors: ["black"],
    styleTags: ["formal", "smart", "interview"],
    occasionTags: ["formal", "interview", "date"],
    brand: "Atelier Mono",
    description: "Sharp blazer built for interview confidence and polished styling.",
    background: "374151",
    prices: [2599, 2699, 2799]
  },
  {
    id: "product-overshirt",
    name: "Utility Overshirt",
    category: "jackets",
    baseColor: "olive",
    secondaryColors: ["sage"],
    styleTags: ["casual", "college", "layered"],
    occasionTags: ["casual", "college", "streetwear"],
    brand: "Drift Supply",
    description: "Soft structured overshirt for layered campus fits.",
    background: "4d5d53",
    prices: [1499, 1599, 1699]
  },
  {
    id: "product-puffer",
    name: "Night Shift Puffer",
    category: "jackets",
    baseColor: "navy",
    secondaryColors: ["black"],
    styleTags: ["winter", "streetwear", "sport"],
    occasionTags: ["casual", "streetwear", "fest"],
    brand: "Kinetic Run",
    description: "Lightweight puffer for late-night commutes and travel looks.",
    background: "1e3a8a",
    prices: [2199, 2299, 2399]
  },
  {
    id: "product-shirt-white",
    name: "Crisp Oxford Shirt",
    category: "shirts",
    baseColor: "white",
    secondaryColors: ["blue"],
    styleTags: ["formal", "smart", "minimal"],
    occasionTags: ["formal", "interview", "college"],
    brand: "Atelier Mono",
    description: "Reliable Oxford shirt with clean structure and all-day wear.",
    background: "f3f4f6",
    foreground: "111827",
    prices: [1099, 1199, 1299]
  },
  {
    id: "product-shirt-navy",
    name: "City Knit Polo",
    category: "shirts",
    baseColor: "navy",
    secondaryColors: ["cream"],
    styleTags: ["smart", "date", "minimal"],
    occasionTags: ["date", "college", "interview"],
    brand: "Northline",
    description: "Polished knit polo for coffee dates and campus-smart looks.",
    background: "172554",
    prices: [1399, 1499, 1599]
  },
  {
    id: "product-shirt-beige",
    name: "Sand Resort Shirt",
    category: "shirts",
    baseColor: "beige",
    secondaryColors: ["brown"],
    styleTags: ["casual", "travel", "relaxed"],
    occasionTags: ["casual", "date", "fest"],
    brand: "Solset",
    description: "Relaxed button-down that keeps the palette clean and warm.",
    background: "d6c3a5",
    foreground: "111827",
    prices: [999, 1099, 1199]
  },
  {
    id: "product-shirt-black",
    name: "After Dark Cuban Shirt",
    category: "shirts",
    baseColor: "black",
    secondaryColors: ["gray"],
    styleTags: ["night", "party", "trend"],
    occasionTags: ["date", "fest", "streetwear"],
    brand: "Drift Supply",
    description: "Fluid Cuban collar shirt for party and night-market styling.",
    background: "111827",
    prices: [1199, 1299, 1399]
  },
  {
    id: "product-jeans-indigo",
    name: "Studio Denim Straight",
    category: "pants",
    baseColor: "indigo",
    secondaryColors: ["navy"],
    styleTags: ["minimal", "college", "streetwear"],
    occasionTags: ["casual", "college", "streetwear"],
    brand: "Atelier Mono",
    description: "Straight-fit denim tuned for sneakers, boots, and easy layering.",
    background: "2563eb",
    prices: [1499, 1599, 1699]
  },
  {
    id: "product-trouser-charcoal",
    name: "Pleated Office Trouser",
    category: "pants",
    baseColor: "charcoal",
    secondaryColors: ["gray"],
    styleTags: ["formal", "smart", "minimal"],
    occasionTags: ["formal", "interview", "date"],
    brand: "Atelier Mono",
    description: "Tailored pleated trouser that stays polished without feeling stiff.",
    background: "3f3f46",
    prices: [1599, 1699, 1799]
  },
  {
    id: "product-cargo-olive",
    name: "Utility Cargo Pant",
    category: "pants",
    baseColor: "olive",
    secondaryColors: ["khaki"],
    styleTags: ["streetwear", "sport", "travel"],
    occasionTags: ["casual", "streetwear", "fest"],
    brand: "Kinetic Run",
    description: "Utility cargos for heavier silhouettes and off-duty fits.",
    background: "556b2f",
    prices: [1399, 1499, 1599]
  },
  {
    id: "product-jogger-gray",
    name: "Recovery Knit Jogger",
    category: "pants",
    baseColor: "gray",
    secondaryColors: ["black"],
    styleTags: ["sport", "casual", "college"],
    occasionTags: ["casual", "college", "streetwear"],
    brand: "Kinetic Run",
    description: "Soft joggers for all-day comfort and casual styling.",
    background: "6b7280",
    prices: [1199, 1299, 1399]
  },
  {
    id: "product-sneaker-white",
    name: "Canvas Sneaker",
    category: "shoes",
    baseColor: "white",
    secondaryColors: ["tan"],
    styleTags: ["college", "casual", "trend"],
    occasionTags: ["casual", "college", "streetwear"],
    brand: "Northline",
    description: "Clean sneaker that keeps most looks wearable and budget friendly.",
    background: "e5e7eb",
    foreground: "111827",
    prices: [1299, 1399, 1499]
  },
  {
    id: "product-loafer-brown",
    name: "Metro Penny Loafer",
    category: "shoes",
    baseColor: "brown",
    secondaryColors: ["tan"],
    styleTags: ["formal", "smart", "date"],
    occasionTags: ["formal", "interview", "date"],
    brand: "Solset",
    description: "Refined loafers for formal and smart-casual rotation.",
    background: "7c4f2a",
    prices: [1899, 1999, 2099]
  },
  {
    id: "product-runner-black",
    name: "Pulse Runner",
    category: "shoes",
    baseColor: "black",
    secondaryColors: ["red"],
    styleTags: ["sport", "travel", "trend"],
    occasionTags: ["casual", "streetwear", "fest"],
    brand: "Kinetic Run",
    description: "Performance-inspired runner for busy days and sporty fits.",
    background: "111827",
    prices: [1799, 1899, 1999]
  },
  {
    id: "product-boot-tan",
    name: "Desert Chelsea Boot",
    category: "shoes",
    baseColor: "tan",
    secondaryColors: ["brown"],
    styleTags: ["date", "smart", "trend"],
    occasionTags: ["date", "formal", "fest"],
    brand: "Drift Supply",
    description: "Chelsea boot that adds sharper attitude to simple layers.",
    background: "c19a6b",
    foreground: "111827",
    prices: [2299, 2399, 2499]
  },
  {
    id: "product-hoodie-gray",
    name: "Recovery Zip Hoodie",
    category: "shirts",
    baseColor: "gray",
    secondaryColors: ["black"],
    styleTags: ["sport", "casual", "trend"],
    occasionTags: ["casual", "college", "streetwear"],
    brand: "Kinetic Run",
    description: "Soft zip hoodie built for coffee runs and sporty day looks.",
    background: "6b7280",
    prices: [1699, 1799, 1899]
  },
  {
    id: "product-tee-black",
    name: "Boxy Essential Tee",
    category: "shirts",
    baseColor: "black",
    secondaryColors: ["white"],
    styleTags: ["minimal", "streetwear", "casual"],
    occasionTags: ["casual", "college", "streetwear"],
    brand: "Northline",
    description: "Boxy tee that anchors layered looks without stealing attention.",
    background: "18181b",
    prices: [799, 899, 999]
  },
  {
    id: "product-skirt-black",
    name: "Edge Midi Skirt",
    category: "pants",
    baseColor: "black",
    secondaryColors: ["gray"],
    styleTags: ["formal", "trend", "minimal"],
    occasionTags: ["formal", "date", "fest"],
    brand: "Solset",
    description: "Structured midi skirt for sharper monochrome dressing.",
    background: "27272a",
    prices: [1499, 1599, 1699]
  },
  {
    id: "product-dress-emerald",
    name: "Emerald Slip Dress",
    category: "shirts",
    baseColor: "emerald",
    secondaryColors: ["green"],
    styleTags: ["party", "formal", "date"],
    occasionTags: ["date", "formal", "fest"],
    brand: "Solset",
    description: "Bias-cut slip dress with a clean evening line and soft sheen.",
    background: "047857",
    prices: [2499, 2599, 2699]
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
      price: (variant.price ?? 0) + 30,
      currency: "INR",
      shop: demoShops[0],
      variant: { ...variant, product }
    },
    {
      id: `${product.id}-offer-ajio`,
      externalUrl: `${demoShops[1].url}/products/${product.id}`,
      stock: 5,
      price: (variant.price ?? 0) + 80,
      currency: "INR",
      shop: demoShops[1],
      variant: { ...variant, product }
    },
    {
      id: `${product.id}-offer-nykaa`,
      externalUrl: `${demoShops[2].url}/products/${product.id}`,
      stock: 3,
      price: (variant.price ?? 0) + 140,
      currency: "INR",
      shop: demoShops[2],
      variant: { ...variant, product }
    },
    {
      id: `${product.id}-offer-tatacliq`,
      externalUrl: `${demoShops[3].url}/products/${product.id}`,
      stock: 10,
      price: (variant.price ?? 0) + 95,
      currency: "INR",
      shop: demoShops[3],
      variant: { ...variant, product }
    }
  ];
}

const demoProducts: Product[] = productSeeds.map((seed) => {
  const variants = seed.prices.map((price, index) =>
    productVariant(
      seed,
      `variant-${seed.id}-${index + 1}`,
      seed.category === "shoes" ? `${40 + index}` : (["S", "M", "L"][index] ?? "M"),
      price,
      image(`${seed.name} ${index + 1}`, seed.background, seed.foreground)
    )
  );

  const baseProduct: Product = {
    id: seed.id,
    name: seed.name,
    category: seed.category,
    baseColor: seed.baseColor,
    secondaryColors: seed.secondaryColors,
    styleTags: seed.styleTags,
    description: seed.description,
    brand: { name: seed.brand },
    imageUrl: image(seed.name, seed.background, seed.foreground),
    occasionTags: seed.occasionTags,
    variants
  };

  const offers = createOffersForProduct(baseProduct);
  const hydratedVariants = variants.map((variant) => ({
    ...variant,
    inventoryOffers: offers.filter((offer) => offer.variant?.id === variant.id)
  }));

  return {
    ...baseProduct,
    variants: hydratedVariants,
    offerSummary: {
      offerCount: offers.length,
      shopCount: demoShops.length,
      lowestPrice: Math.min(...offers.map((offer) => offer.price)),
      highestPrice: Math.max(...offers.map((offer) => offer.price)),
      bestOffer: offers[0],
      availabilityLabel: "In stock across demo retailers",
      badges: ["Best Price", "Available Now"]
    }
  };
});

const demoFitResult: FitResult = {
  userId: "demo-user",
  productId: "product-bomber",
  productName: "Mesh Layer Bomber",
  variantId: "variant-product-bomber-2",
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
      variantId: "variant-product-bomber-1",
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
      variantId: "variant-product-bomber-2",
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
      variantId: "variant-product-bomber-3",
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
    guidance: "Demo measurements are strong enough for screenshot-ready fit confidence."
  },
  assessmentId: "demo-fit-assessment"
};

const demoRecommendations: Recommendation[] = demoProducts.slice(0, 8).map((product, index) => ({
  id: `demo-recommendation-${index + 1}`,
  productId: product.id,
  product,
  score: 95 - index * 3,
  explanation: [
    "Best fit for your measurements and the polished street-smart profile you saved.",
    "Strong style match for your formal-meets-casual preference and tighter budget band.",
    "Pairs cleanly with your preferred neutrals and layered wardrobe history.",
    "Trending silhouette that still stays inside your saved price comfort zone.",
    "Sharper interview-ready option with strong size confidence.",
    "Relaxed add-on piece that softens the overall look without losing polish.",
    "High color compatibility with the darker palette you keep selecting.",
    "Reliable alternative when you want the same vibe at a lower spend."
  ][index],
  fitResult: {
    ...demoFitResult,
    productId: product.id,
    productName: product.name,
    variantId: product.variants?.[1]?.id ?? product.variants?.[0]?.id ?? demoFitResult.variantId,
    selectedSizeLabel: product.variants?.[1]?.sizeLabel ?? product.variants?.[0]?.sizeLabel ?? demoFitResult.selectedSizeLabel,
    recommendedSize: product.variants?.[1]?.sizeLabel ?? product.variants?.[0]?.sizeLabel ?? demoFitResult.recommendedSize
  },
  bestSizeLabel: product.variants?.[1]?.sizeLabel ?? "M",
  bestFitLabel: index % 3 === 0 ? "regular" : index % 3 === 1 ? "slim" : "relaxed",
  fitWarning: null,
  reasonTags: [
    "Best fit for your measurements",
    "Matches your style",
    "Within your budget",
    "Color aligned"
  ].slice(0, 2 + (index % 2)),
  rankingBadges: [
    index === 0 ? "Best Fit" : "Style Match",
    index === 1 ? "Budget Pick" : "Color Match"
  ],
  occasionTags: product.occasionTags,
  budgetLabel: "Under Rs. 3k",
  colorInsight: {
    score: 0.9 - index * 0.03,
    matchingColors: product.secondaryColors?.slice(0, 2) ?? [],
    complementaryColors: [product.baseColor],
    poorMatches: [],
    explanation: `${product.name} supports the neutral-heavy palette in your saved preferences.`
  },
  offerSummary: product.offerSummary,
  cheaperAlternative: demoProducts[(index + 8) % demoProducts.length]
}));

const demoSavedLooks: SavedLook[] = [
  {
    id: "saved-look-1",
    name: "Commute Layers",
    note: "Balanced smart-casual stack for weekday rotation.",
    isWishlist: false,
    items: demoProducts.slice(0, 3).map((product, index) => ({ id: `saved-look-1-item-${index + 1}`, productId: product.id, product })),
    offerSummary: demoProducts[0].offerSummary,
    recommendedProducts: [demoProducts[8], demoProducts[12]],
    occasionTags: ["college", "streetwear"]
  },
  {
    id: "saved-look-2",
    name: "Night Market Fit",
    note: "Saved from the try-on result for a moodier evening scene.",
    isWishlist: false,
    items: [demoProducts[0], demoProducts[7], demoProducts[15]].map((product, index) => ({
      id: `saved-look-2-item-${index + 1}`,
      productId: product.id,
      product
    })),
    offerSummary: demoProducts[7].offerSummary,
    recommendedProducts: [demoProducts[13]],
    occasionTags: ["date", "fest"]
  },
  {
    id: "saved-look-3",
    name: "Liked Campus Edit",
    note: "Wishlist-backed pieces for campus and creator-style outfits.",
    isWishlist: true,
    items: [demoProducts[5], demoProducts[8], demoProducts[12]].map((product, index) => ({
      id: `saved-look-3-item-${index + 1}`,
      productId: product.id,
      product
    })),
    offerSummary: demoProducts[5].offerSummary,
    recommendedProducts: [demoProducts[17]],
    occasionTags: ["college", "casual"]
  },
  {
    id: "saved-look-4",
    name: "Interview Ready Board",
    note: "Structured pieces for placement-day and formal styling.",
    isWishlist: false,
    items: [demoProducts[1], demoProducts[4], demoProducts[9], demoProducts[13]].map((product, index) => ({
      id: `saved-look-4-item-${index + 1}`,
      productId: product.id,
      product
    })),
    offerSummary: demoProducts[1].offerSummary,
    recommendedProducts: [demoProducts[14]],
    occasionTags: ["interview", "formal"]
  },
  {
    id: "saved-look-5",
    name: "Airport Soft Utility",
    note: "Travel-ready layers with comfort-first pieces and clean neutrals.",
    isWishlist: false,
    items: [demoProducts[2], demoProducts[11], demoProducts[12]].map((product, index) => ({
      id: `saved-look-5-item-${index + 1}`,
      productId: product.id,
      product
    })),
    offerSummary: demoProducts[2].offerSummary,
    recommendedProducts: [demoProducts[3], demoProducts[10]],
    occasionTags: ["casual", "streetwear"]
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
  variantId: "variant-product-bomber-2",
  provider: "demo-mode",
  imageUrl: demoUploads.source.publicUrl,
  garmentImageUrl: demoUploads.garment.publicUrl,
  sourceUploadId: demoUploads.source.id,
  garmentUploadId: demoUploads.garment.id,
  fitStyle: "regular",
  comparisonLabel: "Style Studio / Mesh Layer Bomber / M",
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
    summary: "The bomber lands with a strong shoulder line, confident fit, and clean color harmony.",
    metadata: {
      sceneVibe: "Main Character Energy",
      fitStyle: "regular",
      selectedColor: "black"
    }
  },
  variant: {
    ...(demoProducts[0].variants?.[1] ?? demoProducts[0].variants?.[0] ?? productVariant(productSeeds[0], "variant-product-bomber-2", "M", 1899, image("Bomber M", "1f2937"))),
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
  bodyShape: "Athletic",
  fitPreference: "regular",
  preferredColors: ["Black", "White", "Navy", "Beige"],
  avoidedColors: ["Orange"],
  budgetMin: 1200,
  budgetMax: 2800,
  budgetLabel: "Mid-Range",
  closetStatus: "ACTIVE",
  stylePreference: {
    occasions: ["Casual", "Formal", "Travel"],
    preferredStyles: ["streetwear", "minimal", "smart", "sport"],
    fitPreferenceLabel: "Regular"
  },
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
    cheaperAlternative: demoProducts[7],
    bestFitAlternative: { product: demoProducts[1], fit: demoFitResult.fitLabel }
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
