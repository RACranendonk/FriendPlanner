/**
 * Sorts grocery items into the store aisles you'd actually walk through, so
 * the "sort by aisle" view on the list can group them for shopping.
 *
 * This is a local keyword heuristic, not real understanding — sending item
 * text to any classification service would send list contents off-device,
 * which the app's privacy model forbids. Exact/plural keyword hits are
 * checked first; unmatched single words get one fuzzy (typo-tolerant) pass.
 * Anything still unmatched — including in-jokes and deliberately-misspelled
 * gag entries — lands in the "Other" bucket at the end rather than being
 * guessed at.
 */

export type GroceryCategoryId =
  | 'produce'
  | 'bakery'
  | 'meat'
  | 'dairy'
  | 'frozen'
  | 'pantry'
  | 'snacks'
  | 'drinks'
  | 'household'
  | 'other';

export interface GroceryCategory {
  id: GroceryCategoryId;
  label: string;
}

/** Store-walk order: fresh departments first, non-food last, unmatched items at the very end. */
export const GROCERY_CATEGORIES: GroceryCategory[] = [
  { id: 'produce', label: 'Fruit & veg' },
  { id: 'bakery', label: 'Bakery' },
  { id: 'meat', label: 'Meat & fish' },
  { id: 'dairy', label: 'Dairy & eggs' },
  { id: 'frozen', label: 'Frozen' },
  { id: 'pantry', label: 'Pantry & dry goods' },
  { id: 'snacks', label: 'Snacks & sweets' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'household', label: 'Household & toiletries' },
  { id: 'other', label: 'Other' },
];

type KeywordCategoryId = Exclude<GroceryCategoryId, 'other'>;

// Keywords are lowercase; phrases (spaces) are matched as consecutive words.
// Alternate spellings (chili/chilli, yogurt/yoghurt) are listed explicitly
// rather than left to the fuzzy pass, since that's more precise than a typo guess.
const KEYWORDS: Record<KeywordCategoryId, string[]> = {
  produce: [
    'apple', 'banana', 'orange', 'pear', 'grape', 'lemon', 'lime', 'avocado', 'tomato',
    'potato', 'sweet potato', 'onion', 'garlic', 'carrot', 'cucumber', 'lettuce', 'spinach',
    'kale', 'broccoli', 'cauliflower', 'bell pepper', 'mushroom', 'courgette', 'zucchini',
    'aubergine', 'eggplant', 'celery', 'cabbage', 'leek', 'beet', 'beetroot', 'corn', 'pea',
    'green bean', 'herb', 'basil', 'parsley', 'coriander', 'cilantro', 'mint', 'ginger',
    'chili', 'chilli', 'jalapeno', 'melon', 'watermelon', 'pineapple', 'mango', 'kiwi', 'plum',
    'peach', 'apricot', 'cherry', 'strawberry', 'blueberry', 'raspberry', 'blackberry',
    'fruit', 'vegetable', 'veggie', 'salad', 'radish', 'sprout', 'squash', 'pumpkin',
    'grapefruit', 'nectarine', 'fig',
  ],
  bakery: [
    'bread', 'baguette', 'roll', 'bun', 'croissant', 'bagel', 'pita', 'tortilla', 'wrap',
    'cake', 'muffin', 'pastry', 'donut', 'doughnut', 'flatbread', 'naan', 'sourdough',
    'rye bread', 'brioche', 'crumpet',
  ],
  meat: [
    'chicken', 'beef', 'pork', 'lamb', 'bacon', 'sausage', 'ham', 'salami', 'chorizo',
    'mince', 'steak', 'rib', 'turkey', 'duck', 'meatball', 'fish', 'salmon', 'tuna', 'cod',
    'shrimp', 'prawn', 'seafood', 'mussel', 'crab', 'meat', 'deli meat', 'burger patty',
    'hot dog',
  ],
  dairy: [
    'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'egg', 'margarine', 'custard',
    'cream cheese', 'cottage cheese', 'mozzarella', 'cheddar', 'parmesan', 'feta',
    'sour cream',
  ],
  frozen: [
    'frozen', 'ice cream', 'fries', 'pizza', 'waffle', 'popsicle', 'frozen pea',
    'frozen veg', 'frozen fruit', 'ice',
  ],
  pantry: [
    'pasta', 'rice', 'noodle', 'flour', 'sugar', 'salt', 'black pepper', 'peppercorn',
    'spice', 'oil', 'olive oil', 'vinegar', 'sauce', 'ketchup', 'mustard', 'mayo',
    'mayonnaise', 'honey', 'jam', 'peanut butter', 'nutella', 'cereal', 'oat', 'oatmeal',
    'canned', 'tinned', 'bean', 'lentil', 'chickpea', 'stock', 'broth', 'bouillon', 'soup',
    'cracker', 'baking powder', 'baking soda', 'yeast', 'cocoa', 'coffee', 'tea', 'ketchup',
    'stuffing', 'gravy', 'breadcrumb',
  ],
  snacks: [
    'snack', 'chip', 'crisp', 'chocolate', 'candy', 'sweet', 'cookie', 'biscuit', 'popcorn',
    'nut', 'pretzel', 'granola bar', 'chocolate bar', 'marshmallow', 'gum',
  ],
  drinks: [
    'drink', 'beverage', 'water', 'juice', 'soda', 'cola', 'beer', 'wine', 'cider',
    'lemonade', 'soft drink', 'energy drink', 'milkshake', 'sparkling water', 'tonic',
    'squash drink',
  ],
  household: [
    'toilet paper', 'paper towel', 'napkin', 'tissue', 'soap', 'shampoo', 'detergent',
    'dish soap', 'sponge', 'trash bag', 'garbage bag', 'foil', 'cling film', 'aluminum foil',
    'battery', 'candle', 'sunscreen', 'toothpaste', 'deodorant', 'dishwasher tablet',
    'laundry',
  ],
};

const CATEGORY_ORDER: KeywordCategoryId[] = GROCERY_CATEGORIES.filter(
  (c): c is { id: KeywordCategoryId; label: string } => c.id !== 'other',
).map((c) => c.id);

interface Phrase {
  category: KeywordCategoryId;
  words: string[];
}

const PHRASES: Phrase[] = CATEGORY_ORDER.flatMap((category) =>
  KEYWORDS[category].map((keyword) => ({ category, words: keyword.split(' ') })),
);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents (café -> cafe) after NFD decomposition
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Naive English de-pluralizer — good enough for grocery nouns, not a general stemmer. */
function singularize(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 4 && /(ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter(Boolean)
    .map(singularize);
}

function containsPhrase(tokens: string[], words: string[]): boolean {
  if (words.length === 1) return tokens.includes(words[0]);
  for (let i = 0; i <= tokens.length - words.length; i++) {
    if (words.every((w, j) => tokens[i + j] === w)) return true;
  }
  return false;
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** How many typo'd letters still count as "close enough" — scaled so short words need a near-exact match. */
function fuzzyThreshold(len: number): number {
  return len <= 6 ? 1 : 2;
}

const SINGLE_WORD_KEYWORDS = PHRASES.filter((p) => p.words.length === 1);

/** Best-effort store-aisle category for one grocery item's free text. */
export function categorizeGroceryItem(text: string): GroceryCategoryId {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 'other';

  for (const phrase of PHRASES) {
    if (containsPhrase(tokens, phrase.words)) return phrase.category;
  }

  let best: { category: KeywordCategoryId; distance: number } | null = null;
  for (const token of tokens) {
    if (token.length < 4) continue;
    for (const { category, words } of SINGLE_WORD_KEYWORDS) {
      const keyword = words[0];
      const distance = levenshtein(token, keyword);
      if (distance <= fuzzyThreshold(Math.max(token.length, keyword.length))) {
        if (!best || distance < best.distance) best = { category, distance };
      }
    }
  }
  return best?.category ?? 'other';
}
