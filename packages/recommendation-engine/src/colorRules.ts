const compatiblePairs = new Map<string, string[]>([
  ["black", ["white", "gray", "olive", "camel", "blue"]],
  ["white", ["black", "blue", "green", "red", "tan"]],
  ["blue", ["white", "gray", "tan", "black"]],
  ["olive", ["black", "white", "tan", "cream"]]
]);

export const computeColorCompatibility = (
  preferredColors: string[],
  productColors: string[],
  avoidedColors: string[]
) => {
  let score = 0;

  for (const color of productColors) {
    if (avoidedColors.includes(color)) {
      score -= 18;
      continue;
    }

    if (preferredColors.includes(color)) {
      score += 14;
      continue;
    }

    const matchedPreferred = preferredColors.some((preferred) =>
      compatiblePairs.get(preferred)?.includes(color)
    );

    if (matchedPreferred) {
      score += 8;
    }
  }

  return score;
};
