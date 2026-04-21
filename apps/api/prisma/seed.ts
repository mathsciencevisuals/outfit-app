import {
  Prisma,
  PrismaClient,
  RecommendationReason,
  TryOnStatus,
  UserRole
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const brands = [
  { name: "Northline", slug: "northline", countryCode: "US", sizingNotes: "Relaxed outerwear sizing." },
  { name: "Atelier Mono", slug: "atelier-mono", countryCode: "FR", sizingNotes: "Tailored, slightly slim." },
  { name: "Kinetic Run", slug: "kinetic-run", countryCode: "JP", sizingNotes: "Athletic fit with flexible fabrics." }
];

const shops = [
  { name: "City Threads", slug: "city-threads", url: "https://citythreads.example.com", region: "US" },
  { name: "Mode Collective", slug: "mode-collective", url: "https://modecollective.example.com", region: "EU" },
  { name: "Sprint Supply", slug: "sprint-supply", url: "https://sprintsupply.example.com", region: "APAC" }
];

const productDefinitions: Array<[string, string, string, string, string[], string[]]> = [
  ["Northline", "Commuter Jacket", "outerwear", "black", ["gray"], ["urban", "minimal"]],
  ["Northline", "Trail Overshirt", "tops", "olive", ["tan"], ["outdoor", "casual"]],
  ["Northline", "Utility Chino", "bottoms", "camel", ["brown"], ["casual", "smart"]],
  ["Northline", "Weatherproof Parka", "outerwear", "navy", ["black"], ["outdoor", "technical"]],
  ["Northline", "City Knit Polo", "tops", "cream", ["brown"], ["smart", "minimal"]],
  ["Northline", "Structured Tee", "tops", "white", ["black"], ["minimal", "casual"]],
  ["Atelier Mono", "Tapered Trouser", "bottoms", "black", ["gray"], ["tailored", "minimal"]],
  ["Atelier Mono", "Wool Blend Blazer", "outerwear", "charcoal", ["black"], ["tailored", "formal"]],
  ["Atelier Mono", "Silk Camp Shirt", "tops", "blue", ["white"], ["elevated", "smart"]],
  ["Atelier Mono", "Pleated Pant", "bottoms", "stone", ["white"], ["tailored", "smart"]],
  ["Atelier Mono", "Studio Denim", "bottoms", "indigo", ["navy"], ["casual", "minimal"]],
  ["Atelier Mono", "Relaxed Coat", "outerwear", "camel", ["cream"], ["tailored", "elevated"]],
  ["Kinetic Run", "Pace Tee", "tops", "white", ["blue"], ["sport", "technical"]],
  ["Kinetic Run", "Velocity Shorts", "bottoms", "black", ["red"], ["sport", "technical"]],
  ["Kinetic Run", "Sprint Jacket", "outerwear", "blue", ["white"], ["sport", "technical"]],
  ["Kinetic Run", "Recovery Hoodie", "tops", "gray", ["black"], ["sport", "casual"]],
  ["Kinetic Run", "Flex Jogger", "bottoms", "olive", ["black"], ["sport", "casual"]],
  ["Kinetic Run", "Cloud Runner", "footwear", "white", ["gray"], ["sport", "street"]],
  ["Atelier Mono", "Merino Crew", "tops", "forest", ["black"], ["elevated", "minimal"]],
  ["Northline", "Canvas Sneaker", "footwear", "white", ["tan"], ["casual", "street"]]
];

async function main() {
  await prisma.savedLookItem.deleteMany();
  await prisma.savedLook.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.fitAssessment.deleteMany();
  await prisma.tryOnResult.deleteMany();
  await prisma.tryOnRequest.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.inventoryOffer.deleteMany();
  await prisma.sizeChartEntry.deleteMany();
  await prisma.sizeChart.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.providerConfig.deleteMany();
  await prisma.measurement.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const brandMap = new Map<string, { id: string }>();
  for (const brand of brands) {
    const created = await prisma.brand.create({ data: brand });
    brandMap.set(brand.name, created);
  }

  const shopRecords = await Promise.all(shops.map((shop) => prisma.shop.create({ data: shop })));

  const products = [];
  for (const [brandName, name, category, baseColor, secondaryColors, styleTags] of productDefinitions) {
    const brand = brandMap.get(brandName);
    if (!brand) {
      continue;
    }

    const slug = `${brandName}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const variants = ["S", "M", "L"].map((size, index) => ({
      sku: `${slug}-${size.toLowerCase()}`,
      sizeLabel: size,
      color: baseColor,
      price: new Prisma.Decimal(79 + index * 12),
      imageUrl: `https://images.example.com/${slug}-${size.toLowerCase()}.jpg`
    }));

    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        name,
        slug,
        category,
        description: `${name} built for FitMe sample data and merchandising demos.`,
        baseColor,
        secondaryColors,
        materials: category === "outerwear" ? ["nylon", "cotton"] : ["cotton", "elastane"],
        styleTags,
        imageUrl: `https://images.example.com/${slug}.jpg`,
        variants: {
          create: variants
        }
      },
      include: { variants: true }
    });

    const sizeChart = await prisma.sizeChart.create({
      data: {
        brandId: brand.id,
        category,
        notes: `${brandName} ${category} sample chart`,
        entries: {
          create: product.variants.map((variant, index) => ({
            variantId: variant.id,
            sizeLabel: variant.sizeLabel,
            chestMinCm: 88 + index * 4,
            chestMaxCm: 95 + index * 4,
            waistMinCm: 74 + index * 4,
            waistMaxCm: 81 + index * 4,
            hipsMinCm: 90 + index * 4,
            hipsMaxCm: 97 + index * 4,
            inseamMinCm: 76 + index * 2,
            inseamMaxCm: 81 + index * 2
          }))
        }
      }
    });

    for (const [index, variant] of product.variants.entries()) {
      const shop = shopRecords[index % shopRecords.length];
      await prisma.inventoryOffer.create({
        data: {
          shopId: shop.id,
          variantId: variant.id,
          externalUrl: `${shop.url}/products/${product.slug}?sku=${variant.sku}`,
          stock: 8 + index * 3,
          price: new Prisma.Decimal(variant.price.toNumber() + 5),
          currency: "USD"
        }
      });
    }

    products.push({ ...product, sizeChartId: sizeChart.id });
  }

  const demoPassword = await hash("fitme1234", 10);
  const demoUser = await prisma.user.create({
    data: {
      id: "user-demo",
      email: "demo@fitme.dev",
      passwordHash: demoPassword,
      profile: {
        create: {
          firstName: "Demo",
          lastName: "User",
          gender: "female",
          age: 29,
          heightCm: 168,
          weightKg: 61,
          bodyShape: "athletic",
          stylePreference: { preferredStyles: ["minimal", "smart", "sport"] },
          preferredColors: ["black", "white", "olive", "blue"],
          avoidedColors: ["orange"]
        }
      }
    },
    include: { profile: true }
  });

  const adminUser = await prisma.user.create({
    data: {
      id: "user-admin",
      email: "admin@fitme.dev",
      passwordHash: demoPassword,
      role: UserRole.ADMIN,
      profile: {
        create: {
          firstName: "Admin",
          lastName: "User",
          preferredColors: ["black"],
          avoidedColors: []
        }
      }
    }
  });

  await prisma.measurement.create({
    data: {
      userId: demoUser.id,
      chestCm: 91,
      waistCm: 74,
      hipsCm: 97,
      inseamCm: 79,
      shoulderCm: 42,
      source: "seed"
    }
  });

  const firstProduct = products[0];
  const fitAssessment = await prisma.fitAssessment.create({
    data: {
      userId: demoUser.id,
      productId: firstProduct.id,
      score: 89,
      confidence: 0.82,
      verdict: "good",
      notes: "Seeded baseline fit for recommendation demos."
    }
  });

  await prisma.providerConfig.createMany({
    data: [
      {
        provider: "mock",
        displayName: "Mock Try-On",
        baseUrl: null,
        apiKeyHint: "n/a",
        isEnabled: true,
        config: { latencyMs: 300 }
      },
      {
        provider: "http",
        displayName: "HTTP Try-On",
        baseUrl: "http://localhost:4010",
        apiKeyHint: "set externally",
        isEnabled: false,
        config: { timeoutMs: 10000 }
      }
    ]
  });

  const upload = await prisma.upload.create({
    data: {
      userId: demoUser.id,
      key: "uploads/demo/source-image.jpg",
      mimeType: "image/jpeg",
      bucket: "fitme-assets",
      publicUrl: "http://localhost:9000/fitme-assets/uploads/demo/source-image.jpg"
    }
  });

  const tryOnRequest = await prisma.tryOnRequest.create({
    data: {
      userId: demoUser.id,
      variantId: firstProduct.variants[1].id,
      provider: "mock",
      imageUrl: upload.publicUrl,
      status: TryOnStatus.COMPLETED,
      processedAt: new Date()
    }
  });

  await prisma.tryOnResult.create({
    data: {
      requestId: tryOnRequest.id,
      outputImageUrl: `${upload.publicUrl}?rendered=1`,
      overlayImageUrl: `${firstProduct.imageUrl}?overlay=1`,
      confidence: 0.88,
      summary: "Seeded mock try-on output.",
      metadata: { mode: "seed" }
    }
  });

  const recommendationProducts = products.slice(0, 6);
  await prisma.recommendation.createMany({
    data: recommendationProducts.map((product, index) => ({
      userId: demoUser.id,
      productId: product.id,
      rank: index + 1,
      score: 95 - index * 5,
      reason:
        index < 2 ? RecommendationReason.FIT : index < 4 ? RecommendationReason.STYLE : RecommendationReason.COLOR,
      explanation: `Seeded recommendation ${index + 1}`
    }))
  });

  await prisma.savedLook.create({
    data: {
      userId: demoUser.id,
      name: "Weekend Layered Look",
      note: "Balanced for city walking and casual dinner.",
      items: {
        create: [
          { productId: products[0].id },
          { productId: products[2].id },
          { productId: products[19].id }
        ]
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        seededBrands: brands.length,
        seededShops: shopRecords.length,
        seededProducts: products.length,
        demoUserId: demoUser.id,
        adminUserId: adminUser.id,
        fitAssessmentId: fitAssessment.id
      },
      null,
      2
    )
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
    await prisma.$disconnect();
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
