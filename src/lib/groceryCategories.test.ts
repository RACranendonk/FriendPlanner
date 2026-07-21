import { describe, expect, it } from 'vitest';
import { categorizeGroceryItem } from './groceryCategories';

describe('categorizeGroceryItem', () => {
  it('matches common items to their aisle', () => {
    expect(categorizeGroceryItem('Bananas')).toBe('produce');
    expect(categorizeGroceryItem('sourdough bread')).toBe('bakery');
    expect(categorizeGroceryItem('chicken thighs')).toBe('meat');
    expect(categorizeGroceryItem('greek yogurt')).toBe('dairy');
    expect(categorizeGroceryItem('frozen pizza')).toBe('frozen');
    expect(categorizeGroceryItem('jasmine rice')).toBe('pantry');
    expect(categorizeGroceryItem('bag of chips')).toBe('snacks');
    expect(categorizeGroceryItem('sparkling water')).toBe('drinks');
    expect(categorizeGroceryItem('toilet paper')).toBe('household');
  });

  it('handles plurals via de-pluralization', () => {
    expect(categorizeGroceryItem('tomatoes')).toBe('produce');
    expect(categorizeGroceryItem('onions')).toBe('produce');
    expect(categorizeGroceryItem('potatoes')).toBe('produce');
  });

  it('is case- and punctuation-insensitive', () => {
    expect(categorizeGroceryItem('BANANAS!!!')).toBe('produce');
    expect(categorizeGroceryItem('  eggs, a dozen  ')).toBe('dairy');
  });

  it('matches multi-word keyword phrases without false-matching substrings', () => {
    expect(categorizeGroceryItem('bell peppers, red')).toBe('produce');
    expect(categorizeGroceryItem('black pepper')).toBe('pantry');
    // "ham" is a meat keyword, but must not match inside unrelated words like "shampoo".
    expect(categorizeGroceryItem('shampoo')).toBe('household');
  });

  it('tolerates small typos via the fuzzy fallback', () => {
    expect(categorizeGroceryItem('bananna')).toBe('produce');
    expect(categorizeGroceryItem('tomatoe')).toBe('produce');
    expect(categorizeGroceryItem('choclate')).toBe('snacks');
  });

  it('falls back to "other" for nonsense, in-jokes, and unrecognized items', () => {
    expect(categorizeGroceryItem('Jeffs mystery goo')).toBe('other');
    expect(categorizeGroceryItem('the good snacks (you know which ones)')).toBe('snacks');
    expect(categorizeGroceryItem('xyzzy')).toBe('other');
    expect(categorizeGroceryItem('')).toBe('other');
    expect(categorizeGroceryItem('   ')).toBe('other');
  });

  it('picks the first matching aisle in store order when an item mentions several', () => {
    // "bread" (bakery) should win over "butter" (dairy) since bakery comes first in store order.
    expect(categorizeGroceryItem('bread and butter')).toBe('bakery');
  });
});
