import { ColorCompatibilityResult } from "./types";

const paletteGroups: Record<string, string[]> = {
  neutral: ["black", "white", "gray", "charcoal", "stone", "cream", "tan", "camel"],
  earth: ["olive", "brown", "camel", "tan", "cream", "forest"],
  cool: ["blue", "navy", "indigo", "gray", "white"],
  warm: ["red", "orange", "camel", "brown", "cream"],
  jewel: ["forest", "blue", "indigo", "red"]
};

const directCompatibility = new Map<string, string[]>([
  ["black", ["white", "gray", "olive", "camel", "blue", "cream", "charcoal"]],
  ["white", ["black", "blue", "green", "red", "tan", "camel", "olive"]],
  ["blue", ["white", "gray", "tan", "black", "cream", "olive", "camel"]],
  ["navy", ["white", "gray", "camel", "cream", "tan", "olive"]],
  ["olive", ["black", "white", "tan", "cream", "camel", "navy"]],
  ["cream", ["black", "navy", "camel", "olive", "brown", "forest"]],
  ["camel", ["black", "white", "olive", "navy", "cream", "forest"]],
  ["gray", ["black", "white", "blue", "olive", "camel"]],
  ["forest", ["cream", "camel", "black", "white", "tan"]],
  ["red", ["black", "white", "gray", "navy", "cream"]]
]);

const directConflict = new Map<string, string[]>([
  ["orange", ["red", "brown"]],
  ["red", ["orange", "green"]],
  ["brown", ["orange"]],
  ["forest", ["red"]],
  ["olive", ["orange"]]
]);

function normalizeColor(color: string) {
  return color.trim().toLowerCase();
}

function paletteForColor(color: string) {
  const normalized = normalizeColor(color);
  return Object.entries(paletteGroups)
    .filter(([, values]) => values.includes(normalized))
    .map(([key]) => key);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasSharedPalette(left: string, right: string) {
  const leftPalettes = paletteForColor(left);
  const rightPalettes = paletteForColor(right);
  return leftPalettes.some((palette) => rightPalettes.includes(palette));
}

function explainsMatch(matching: string[], complementary: string[], poor: string[]) {
  if (matching.length > 0 && complementary.length > 0) {
    return `Directly matches ${matching.join(", ")} and layers well with ${complementary.join(", ")}.`;
  }
  if (matching.length > 0) {
    return `Directly matches your preferred palette through ${matching.join(", ")}.`;
  }
  if (complementary.length > 0) {
    return `Works as a complementary palette through ${complementary.join(", ")}.`;
  }
  if (poor.length > 0) {
    return `Color risk is higher because ${poor.join(", ")} clashes with your avoided palette.`;
  }
  return "Color alignment is usable but neutral rather than strongly matched.";
}

export function analyzeColorCompatibility(
  preferredColors: string[],
  productColors: string[],
  avoidedColors: string[],
  anchorColors: string[] = []
): ColorCompatibilityResult {
  const normalizedPreferred = unique(preferredColors.map(normalizeColor));
  const normalizedProduct = unique(productColors.map(normalizeColor));
  const normalizedAvoided = unique(avoidedColors.map(normalizeColor));
  const normalizedAnchor = unique(anchorColors.map(normalizeColor));

  const matchingColors: string[] = [];
  const complementaryColors: string[] = [];
  const poorMatches: string[] = [];
  let score = 0;

  for (const color of normalizedProduct) {
    if (normalizedAvoided.includes(color)) {
      poorMatches.push(color);
      score -= 20;
      continue;
    }

    const conflictsWithBase = [...normalizedPreferred, ...normalizedAnchor].some((baseColor) =>
      directConflict.get(baseColor)?.includes(color)
    );
    if (conflictsWithBase) {
      poorMatches.push(color);
      score -= 12;
      continue;
    }

    if (normalizedPreferred.includes(color) || normalizedAnchor.includes(color)) {
      matchingColors.push(color);
      score += 16;
      continue;
    }

    const directMatch = normalizedPreferred.some((preferred) => directCompatibility.get(preferred)?.includes(color));
    const anchorMatch = normalizedAnchor.some((anchor) => directCompatibility.get(anchor)?.includes(color));
    const sharedPalette = [...normalizedPreferred, ...normalizedAnchor].some((baseColor) => hasSharedPalette(baseColor, color));

    if (directMatch || anchorMatch) {
      complementaryColors.push(color);
      score += 10;
      continue;
    }

    if (sharedPalette) {
      complementaryColors.push(color);
      score += 6;
      continue;
    }

    score += 1.5;
  }

  return {
    score,
    matchingColors: unique(matchingColors),
    complementaryColors: unique(complementaryColors),
    poorMatches: unique(poorMatches),
    explanation: explainsMatch(unique(matchingColors), unique(complementaryColors), unique(poorMatches))
  };
}

export const computeColorCompatibility = (
  preferredColors: string[],
  productColors: string[],
  avoidedColors: string[]
) => analyzeColorCompatibility(preferredColors, productColors, avoidedColors).score;
