// Board IDs must be replaced with real Pinterest board IDs after creating boards on your account.
// Board naming convention in Prompt 10: "FitMe - <Name>"
export const FITME_BOARDS: Record<string, string> = {
  // Gender boards (3)
  men:        'REPLACE_WITH_REAL_BOARD_ID',
  women:      'REPLACE_WITH_REAL_BOARD_ID',
  unisex:     'REPLACE_WITH_REAL_BOARD_ID',
  // Style boards (8)
  casual:     'REPLACE_WITH_REAL_BOARD_ID',
  formal:     'REPLACE_WITH_REAL_BOARD_ID',
  streetwear: 'REPLACE_WITH_REAL_BOARD_ID',
  ethnic:     'REPLACE_WITH_REAL_BOARD_ID',
  sports:     'REPLACE_WITH_REAL_BOARD_ID',
  minimalist: 'REPLACE_WITH_REAL_BOARD_ID',
  party:      'REPLACE_WITH_REAL_BOARD_ID',
  bohemian:   'REPLACE_WITH_REAL_BOARD_ID',
  // Colour boards (9)
  black:      'REPLACE_WITH_REAL_BOARD_ID',
  white:      'REPLACE_WITH_REAL_BOARD_ID',
  earthy:     'REPLACE_WITH_REAL_BOARD_ID',
  blue:       'REPLACE_WITH_REAL_BOARD_ID',
  navy:       'REPLACE_WITH_REAL_BOARD_ID',
  pink:       'REPLACE_WITH_REAL_BOARD_ID',
  red:        'REPLACE_WITH_REAL_BOARD_ID',
  green:      'REPLACE_WITH_REAL_BOARD_ID',
  brights:    'REPLACE_WITH_REAL_BOARD_ID',
  // Budget boards — earn affiliate commissions (4)
  under500:   'REPLACE_WITH_REAL_BOARD_ID',
  '500_2000': 'REPLACE_WITH_REAL_BOARD_ID',
  '2000_5000':'REPLACE_WITH_REAL_BOARD_ID',
  above5000:  'REPLACE_WITH_REAL_BOARD_ID',
  // Size boards (4)
  xs_s:       'REPLACE_WITH_REAL_BOARD_ID',
  m_l:        'REPLACE_WITH_REAL_BOARD_ID',
  xl_xxl:     'REPLACE_WITH_REAL_BOARD_ID',
  plus:       'REPLACE_WITH_REAL_BOARD_ID',
};

export const GENDER_MAP: Record<string, string> = {
  male: 'men', female: 'women', other: 'unisex',
};

export const SIZE_MAP: Record<string, string> = {
  XS: 'xs_s', S: 'xs_s', M: 'm_l', L: 'm_l',
  XL: 'xl_xxl', XXL: 'xl_xxl', plus: 'plus',
};

export const BUDGET_MAP: Record<string, string> = {
  under500: 'under500', '500_2000': '500_2000',
  '2000_5000': '2000_5000', above5000: 'above5000',
};

export const BUDGET_BOARD_KEYS = ['under500', '500_2000', '2000_5000', 'above5000'];
