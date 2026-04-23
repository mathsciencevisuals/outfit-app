import test from "node:test";
import assert from "node:assert/strict";

import { assessFit } from "./computeFit";

test("assessFit recommends the balanced middle size for a regular top profile", () => {
  const result = assessFit({
    body: {
      chestCm: 93,
      waistCm: 78,
      shoulderCm: 42.5
    },
    fitPreference: "regular",
    garmentCategory: "tops",
    sizeOptions: [
      {
        sizeLabel: "S",
        chest: { minCm: 86, maxCm: 90 },
        waist: { minCm: 72, maxCm: 75 },
        shoulder: { minCm: 40, maxCm: 41.5 }
      },
      {
        sizeLabel: "M",
        chest: { minCm: 91, maxCm: 95 },
        waist: { minCm: 76, maxCm: 80 },
        shoulder: { minCm: 41.5, maxCm: 43.5 }
      },
      {
        sizeLabel: "L",
        chest: { minCm: 96, maxCm: 100 },
        waist: { minCm: 81, maxCm: 85 },
        shoulder: { minCm: 43.5, maxCm: 45 }
      }
    ]
  });

  assert.equal(result.recommendedSize, "M");
  assert.equal(result.fitLabel, "regular");
  assert.ok(result.fitScore >= 80);
});

test("assessFit flags inseam-short when the chosen bottom size runs short", () => {
  const result = assessFit({
    body: {
      waistCm: 79,
      hipsCm: 98,
      inseamCm: 84
    },
    fitPreference: "regular",
    garmentCategory: "bottoms",
    selectedSizeLabel: "M",
    sizeOptions: [
      {
        sizeLabel: "M",
        waist: { minCm: 77, maxCm: 81 },
        hips: { minCm: 97, maxCm: 101 },
        inseam: { minCm: 78, maxCm: 82 }
      },
      {
        sizeLabel: "L",
        waist: { minCm: 82, maxCm: 86 },
        hips: { minCm: 102, maxCm: 106 },
        inseam: { minCm: 82, maxCm: 86 }
      }
    ]
  });

  assert.ok(result.sizeComparisons.some((comparison) => comparison.sizeLabel === "M" && comparison.issues.some((issue) => issue.code === "inseam-short")));
  assert.equal(result.recommendedSize, "M");
});
