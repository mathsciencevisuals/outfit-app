import { Prisma, PrismaClient, TryOnStatus } from "@prisma/client";
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

function brandAdjustment(brandName: string) {
  if (brandName === "Atelier Mono") {
    return { chest: -1, waist: -1, hips: -1, shoulder: -0.5, foot: -0.3 };
  }
  if (brandName === "Northline") {
    return { chest: 1.5, waist: 1, hips: 1, shoulder: 0.5, foot: 0 };
  }
  return { chest: 0, waist: 0, hips: 0, shoulder: 0.25, foot: 0.2 };
}

function sizeChartForCategory(brandName: string, category: string, index: number) {
  const adjustment = brandAdjustment(brandName);

  if (category === "footwear") {
    return {
      footLengthMinCm: 24 + index * 1.1 + adjustment.foot,
      footLengthMaxCm: 25 + index * 1.1 + adjustment.foot
    };
  }

  if (category === "bottoms") {
    return {
      waistMinCm: 73 + index * 4 + adjustment.waist,
      waistMaxCm: 79 + index * 4 + adjustment.waist,
      hipsMinCm: 90 + index * 4 + adjustment.hips,
      hipsMaxCm: 97 + index * 4 + adjustment.hips,
      inseamMinCm: 75 + index * 2,
      inseamMaxCm: 80 + index * 2
    };
  }

  return {
    chestMinCm: 87 + index * 4 + adjustment.chest,
    chestMaxCm: 94 + index * 4 + adjustment.chest,
    waistMinCm: 74 + index * 4 + adjustment.waist,
    waistMaxCm: 81 + index * 4 + adjustment.waist,
    shoulderMinCm: 41 + index * 1.3 + adjustment.shoulder,
    shoulderMaxCm: 43.5 + index * 1.3 + adjustment.shoulder
  };
}

async function resetDatabase() {
  await (prisma as any).challengeParticipation.deleteMany();
  await (prisma as any).shareEvent.deleteMany();
  await (prisma as any).lookRating.deleteMany();
  await (prisma as any).couponRedemption.deleteMany();
  await (prisma as any).coupon.deleteMany();
  await (prisma as any).campaignBanner.deleteMany();
  await (prisma as any).campaign.deleteMany();
  await (prisma as any).referralEvent.deleteMany();
  await (prisma as any).referralCode.deleteMany();
  await (prisma as any).rewardTransaction.deleteMany();
  await (prisma as any).rewardWallet.deleteMany();
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
}

async function main() {
  await resetDatabase();

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
        variants: { create: variants }
      },
      include: { variants: true }
    });

    const sizeChart = await prisma.sizeChart.create({
      data: {
        brandId: brand.id,
        category,
        notes: `${brandName} ${category} sample chart`
      }
    });

    await prisma.sizeChartEntry.createMany({
      data: product.variants.map((variant, index) => ({
        sizeChartId: sizeChart.id,
        variantId: variant.id,
        sizeLabel: variant.sizeLabel,
        ...sizeChartForCategory(brandName, category, index)
      })) as any
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

    products.push(product);
  }

  const demoPassword = await hash("fitme1234", 10);
  const demoUser = await prisma.user.create({
    data: {
      id: "user-demo",
      email: "demo@fitme.dev",
      passwordHash: demoPassword,
      role: "USER" as any,
      profile: {
        create: {
          firstName: "Demo",
          lastName: "User",
          gender: "female",
          age: 21,
          heightCm: 168,
          weightKg: 61,
          bodyShape: "athletic",
          fitPreference: "regular",
          stylePreference: { preferredStyles: ["minimal", "smart", "sport"] },
          preferredColors: ["black", "white", "olive", "blue"],
          avoidedColors: ["orange"]
        } as any
      }
    },
    include: { profile: true }
  });

  const adminUser = await prisma.user.create({
    data: {
      id: "user-admin",
      email: "admin@fitme.dev",
      passwordHash: demoPassword,
      role: "ADMIN" as any,
      profile: {
        create: {
          firstName: "Admin",
          lastName: "User",
          fitPreference: "regular",
          preferredColors: ["black"],
          avoidedColors: []
        } as any
      }
    }
  });

  await prisma.user.create({
    data: {
      id: "user-operator",
      email: "operator@fitme.dev",
      passwordHash: demoPassword,
      role: "OPERATOR" as any,
      profile: {
        create: {
          firstName: "Operator",
          lastName: "User",
          fitPreference: "relaxed",
          preferredColors: ["olive"],
          avoidedColors: []
        } as any
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
      footLengthCm: 25,
      source: "seed"
    }
  });

  const firstProduct = products[0];
  await prisma.fitAssessment.create({
    data: {
      userId: demoUser.id,
      productId: firstProduct.id,
      variantId: firstProduct.variants[1].id,
      chosenSizeLabel: firstProduct.variants[1].sizeLabel,
      recommendedSize: firstProduct.variants[1].sizeLabel,
      fitLabel: "regular",
      score: 89,
      confidence: 0.82,
      verdict: "regular",
      notes: "Size M looks balanced for the seeded demo fit profile.",
      issues: [],
      explanation: "Seeded baseline fit guidance for recommendation demos.",
      metadata: {
        alternatives: [{ sizeLabel: "L", fitScore: 82, reason: "Try L for a more relaxed drape." }]
      }
    } as any
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
      sourceUploadId: upload.id,
      provider: "mock",
      imageUrl: upload.publicUrl,
      status: TryOnStatus.COMPLETED,
      statusMessage: "Try-on completed",
      processedAt: new Date()
    } as any
  });

  await prisma.tryOnResult.create({
    data: {
      requestId: tryOnRequest.id,
      outputImageUrl: `${upload.publicUrl}?rendered=1`,
      overlayImageUrl: `${firstProduct.imageUrl}?overlay=1`,
      confidence: 0.88,
      summary: "Mock try-on generated successfully with a balanced drape estimate.",
      metadata: { provider: "mock" }
    }
  });

  await prisma.recommendation.createMany({
    data: products.slice(0, 6).map((product, index) => ({
      userId: demoUser.id,
      productId: product.id,
      rank: index + 1,
      score: 92 - index * 4,
      reason: index < 2 ? "FIT" : index < 4 ? "STYLE" : "COLOR",
      explanation: `Seeded recommendation ${index + 1} for demo flows`
    }))
  });

  const savedLook = await prisma.savedLook.create({
    data: {
      userId: demoUser.id,
      name: "Commute Layers",
      note: "Balanced smart-casual stack for weekday rotation.",
      items: { create: products.slice(0, 3).map((product) => ({ productId: product.id })) }
    },
    include: { items: true }
  });

  const wallet = await (prisma as any).rewardWallet.create({
    data: {
      userId: demoUser.id,
      balancePoints: 320,
      lifetimeEarned: 420,
      lifetimeSpent: 100,
      tierLabel: "Insider"
    }
  });

  await (prisma as any).rewardTransaction.createMany({
    data: [
      {
        walletId: wallet.id,
        userId: demoUser.id,
        type: "EARN",
        reason: "PROFILE_COMPLETE",
        amountPoints: 80,
        balanceAfter: 80,
        description: "Completed profile essentials",
        referenceKey: "seed-profile-complete"
      },
      {
        walletId: wallet.id,
        userId: demoUser.id,
        type: "EARN",
        reason: "FIRST_TRY_ON",
        amountPoints: 120,
        balanceAfter: 200,
        description: "First try-on reward",
        referenceKey: "seed-first-tryon"
      },
      {
        walletId: wallet.id,
        userId: demoUser.id,
        type: "EARN",
        reason: "LOOK_SHARE",
        amountPoints: 20,
        balanceAfter: 220,
        description: "Shared a look to WhatsApp",
        referenceKey: "seed-share"
      },
      {
        walletId: wallet.id,
        userId: demoUser.id,
        type: "EARN",
        reason: "CHALLENGE_PARTICIPATION",
        amountPoints: 100,
        balanceAfter: 320,
        description: "Completed campus challenge",
        referenceKey: "seed-challenge"
      },
      {
        walletId: wallet.id,
        userId: demoUser.id,
        type: "SPEND",
        reason: "COUPON_UNLOCK",
        amountPoints: 100,
        balanceAfter: 220,
        description: "Unlocked budget coupon",
        referenceKey: "seed-coupon-unlock"
      }
    ]
  });

  const referralCode = await (prisma as any).referralCode.create({
    data: {
      userId: demoUser.id,
      code: "FIT-CAMPUS21"
    }
  });

  await (prisma as any).referralEvent.createMany({
    data: [
      {
        referralCodeId: referralCode.id,
        referrerUserId: demoUser.id,
        eventType: "CODE_CREATED",
        rewardPoints: 0
      },
      {
        referralCodeId: referralCode.id,
        referrerUserId: demoUser.id,
        eventType: "INVITE_SENT",
        rewardPoints: 40,
        metadata: { channel: "instagram_dm" }
      },
      {
        referralCodeId: referralCode.id,
        referrerUserId: demoUser.id,
        referredUserId: adminUser.id,
        eventType: "CONVERTED",
        rewardPoints: 150,
        metadata: { source: "campus-ambassador" }
      }
    ]
  });

  const campusCampaign = await (prisma as any).campaign.create({
    data: {
      slug: "campus-casual-week",
      title: "Campus Casual Week",
      description: "Student-first layers and budget looks for all-day campus wear.",
      theme: "CAMPUS_CASUAL",
      status: "ACTIVE",
      targetAudience: "students",
      budgetLabel: "Under 999",
      startsAt: new Date("2026-04-15T00:00:00.000Z"),
      endsAt: new Date("2026-05-15T00:00:00.000Z"),
      banners: {
        create: [
          {
            title: "Campus Casual",
            subtitle: "Back-to-class layers built for long days and fast outfit decisions.",
            ctaLabel: "See rewards",
            ctaRoute: "/rewards",
            themeTone: "earth",
            isActive: true,
            position: 0
          },
          {
            title: "Challenge Unlock",
            subtitle: "Join the weekly campus look challenge and stack points faster.",
            ctaLabel: "Join challenge",
            ctaRoute: "/challenges",
            themeTone: "sage",
            isActive: true,
            position: 1
          }
        ]
      }
    },
    include: { banners: true }
  });

  const interviewCampaign = await (prisma as any).campaign.create({
    data: {
      slug: "interview-ready-edit",
      title: "Interview Ready Edit",
      description: "Sharper silhouettes and trust-building pieces for student interviews.",
      theme: "INTERVIEW_READY",
      status: "ACTIVE",
      targetAudience: "students",
      budgetLabel: "Premium picks",
      startsAt: new Date("2026-04-10T00:00:00.000Z"),
      endsAt: new Date("2026-05-20T00:00:00.000Z"),
      banners: {
        create: [
          {
            title: "Interview Ready",
            subtitle: "Try fitted blazers, trousers, and polished campus formal looks.",
            ctaLabel: "Open coupons",
            ctaRoute: "/coupons",
            themeTone: "navy",
            isActive: true,
            position: 0
          }
        ]
      }
    },
    include: { banners: true }
  });

  const festCampaign = await (prisma as any).campaign.create({
    data: {
      slug: "fest-look-push",
      title: "Fest Look Push",
      description: "High-energy festive styling built around try-on and social sharing.",
      theme: "FEST_LOOK",
      status: "ACTIVE",
      targetAudience: "students",
      budgetLabel: "Mix and match",
      startsAt: new Date("2026-04-18T00:00:00.000Z"),
      endsAt: new Date("2026-05-25T00:00:00.000Z"),
      banners: {
        create: [
          {
            title: "Fest Look",
            subtitle: "Share your best rendered outfit and earn extra campus points.",
            ctaLabel: "Share now",
            ctaRoute: "/saved-looks",
            themeTone: "sunset",
            isActive: true,
            position: 0
          }
        ]
      }
    }
  });

  const under999Coupon = await (prisma as any).coupon.create({
    data: {
      campaignId: campusCampaign.id,
      code: "UNDER999",
      title: "Budget Under 999",
      description: "Unlock student-friendly essentials below the campus budget line.",
      type: "FIXED_AMOUNT",
      discountValue: 150,
      rewardCostPoints: 100,
      unlockThreshold: 200,
      minSpend: 799,
      isActive: true,
      startsAt: new Date("2026-04-15T00:00:00.000Z"),
      endsAt: new Date("2026-05-15T00:00:00.000Z")
    }
  });

  const interviewCoupon = await (prisma as any).coupon.create({
    data: {
      campaignId: interviewCampaign.id,
      code: "INTERVIEW10",
      title: "Interview Edit 10% Off",
      description: "Confidence-driven workwear savings for student interview prep.",
      type: "PERCENTAGE",
      discountValue: 10,
      unlockThreshold: 300,
      isActive: true,
      startsAt: new Date("2026-04-10T00:00:00.000Z"),
      endsAt: new Date("2026-05-20T00:00:00.000Z")
    }
  });

  await (prisma as any).couponRedemption.createMany({
    data: [
      {
        couponId: under999Coupon.id,
        userId: demoUser.id,
        walletId: wallet.id,
        status: "UNLOCKED",
        pointsSpent: 100
      },
      {
        couponId: interviewCoupon.id,
        userId: demoUser.id,
        walletId: wallet.id,
        status: "REDEEMED",
        pointsSpent: 0,
        redeemedAt: new Date("2026-04-21T10:00:00.000Z")
      }
    ]
  });

  await (prisma as any).lookRating.create({
    data: {
      userId: demoUser.id,
      savedLookId: savedLook.id,
      tryOnRequestId: tryOnRequest.id,
      productId: firstProduct.id,
      rating: 5,
      comment: "Great fit balance for classes and commute."
    }
  });

  await (prisma as any).shareEvent.create({
    data: {
      userId: demoUser.id,
      savedLookId: savedLook.id,
      tryOnRequestId: tryOnRequest.id,
      channel: "whatsapp",
      rewardGranted: 20
    }
  });

  await (prisma as any).challengeParticipation.createMany({
    data: [
      {
        userId: demoUser.id,
        campaignId: campusCampaign.id,
        challengeName: "Campus Casual Week",
        status: "CLAIMED",
        rewardPoints: 100,
        completedAt: new Date("2026-04-20T12:00:00.000Z")
      },
      {
        userId: demoUser.id,
        campaignId: festCampaign.id,
        challengeName: "Fest Look Push",
        status: "JOINED",
        rewardPoints: 40
      }
    ]
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
