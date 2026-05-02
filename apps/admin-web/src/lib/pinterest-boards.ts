export type BoardEntry = { key: string; boardId: string };

export const boardGroups: Array<{ title: string; subtitle: string; keys: string[] }> = [
  {
    title: "Gender boards",
    subtitle: "Primary audience segments.",
    keys: ["men", "women", "unisex"]
  },
  {
    title: "Style boards",
    subtitle: "Mapped to style preferences and trend filters.",
    keys: ["casual", "formal", "streetwear", "ethnic", "sports", "minimalist", "party", "bohemian"]
  },
  {
    title: "Colour boards",
    subtitle: "Used when matching preferred colours.",
    keys: ["black", "white", "earthy", "blue", "navy", "pink", "red", "green", "brights"]
  },
  {
    title: "Budget boards",
    subtitle: "Used for price-filtered affiliate discovery.",
    keys: ["under500", "500_2000", "2000_5000", "above5000"]
  },
  {
    title: "Size boards",
    subtitle: "Mapped to size groups for personalized feeds.",
    keys: ["xs_s", "m_l", "xl_xxl", "plus"]
  }
];

export const boardLabels: Record<string, string> = {
  men: "FitMe - Men",
  women: "FitMe - Women",
  unisex: "FitMe - Unisex",
  casual: "FitMe - Casual",
  formal: "FitMe - Formal",
  streetwear: "FitMe - Streetwear",
  ethnic: "FitMe - Ethnic Indian",
  sports: "FitMe - Sports & Active",
  minimalist: "FitMe - Minimalist",
  party: "FitMe - Party & Festive",
  bohemian: "FitMe - Bohemian",
  black: "FitMe - Black Outfits",
  white: "FitMe - White & Ivory",
  earthy: "FitMe - Earth Tones",
  blue: "FitMe - Blues",
  navy: "FitMe - Navy & Denim",
  pink: "FitMe - Pinks & Reds",
  red: "FitMe - Pinks & Reds",
  green: "FitMe - Greens",
  brights: "FitMe - Brights & Neons",
  under500: "FitMe - Under 500",
  "500_2000": "FitMe - 500 to 2000",
  "2000_5000": "FitMe - 2000 to 5000",
  above5000: "FitMe - Above 5000",
  xs_s: "FitMe - XS & S Sizes",
  m_l: "FitMe - M & L Sizes",
  xl_xxl: "FitMe - XL & XXL Sizes",
  plus: "FitMe - Plus Size Fashion"
};

export function orderedBoardKeys() {
  return boardGroups.flatMap((group) => group.keys);
}
