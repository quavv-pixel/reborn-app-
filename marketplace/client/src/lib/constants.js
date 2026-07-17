export const CATEGORIES = [
  { value: 'sneakers', label: 'Sneakers' },
  { value: 'streetwear', label: 'Streetwear' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'home', label: 'Home' },
  { value: 'other', label: 'Other' },
];

export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'used', label: 'Used' },
  { value: 'for_parts', label: 'For Parts' },
];

export function formatPrice(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
