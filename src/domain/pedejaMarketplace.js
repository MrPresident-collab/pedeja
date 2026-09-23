import { PEDEJA_BUSINESS_CATEGORIES } from '../constants.js';

export function filterPedejaMarketplaceBusinesses(restaurants, serviceType) {
  const allowed = PEDEJA_BUSINESS_CATEGORIES[serviceType];
  if (!allowed) return [];

  const allowedCategories = new Set(allowed.map(category => category.toLowerCase().trim()));
  return restaurants.filter((restaurant) =>
    allowedCategories.has(String(restaurant.category || '').toLowerCase().trim()),
  );
}
