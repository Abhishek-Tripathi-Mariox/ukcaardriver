/**
 * Single source of truth for how a driver's rating is DISPLAYED.
 *
 * Storage rule: a driver nobody has rated yet has a real rating of 0, and all
 * averaging maths uses that 0. Display rule: show a neutral 5.0 until a genuine
 * rating exists (real averages are always >= 1).
 *
 * This lived inline in three screens with three different data sources, which
 * is how the dashboard ended up showing 4.0 while Earnings showed 5.0. Every
 * screen must call this helper AND read the rating from driverProfile.rating
 * (what both /drivers/me and /drivers/me/ratings return).
 */
export function driverDisplayRating(rating?: number | null): number {
  return rating && rating > 0 ? rating : 5;
}

/** Same rule, formatted for display (one decimal). */
export function driverRatingText(rating?: number | null): string {
  return driverDisplayRating(rating).toFixed(1);
}

export default driverDisplayRating;
