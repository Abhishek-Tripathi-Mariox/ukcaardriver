import { Dimensions, PixelRatio } from 'react-native';

/**
 * Responsive scaling helpers (ported from the customer app).
 *
 * The driver screens were laid out against the Figma reference frame of
 * 392 x 851 dp. On that exact device everything "fits"; on narrower/shorter
 * devices the same hardcoded pixels are proportionally too large (looks
 * zoomed), and on larger devices too small.
 *
 * These helpers re-express a value as a fraction of the reference frame and
 * re-apply it to the actual screen, so a layout designed once renders
 * proportionally on any device.
 *
 *   s(n)   — scale by width. Use for widths, horizontal padding, icon sizes,
 *            border radius — anything that should track how wide the screen is.
 *   vs(n)  — scale by height. Use for vertical gaps / element heights that
 *            should track how tall the screen is.
 *   ms(n)  — "moderate" width scale: scales, but dampened (factor 0.5 by
 *            default) so values don't balloon on tablets / shrink to nothing
 *            on tiny phones. Good default for most sizes.
 *   fs(n)  — font scale: moderate scale + snap to the device pixel grid so
 *            text stays crisp. Use for every fontSize / lineHeight.
 *
 * NOTE: NativeWind arbitrary classes (`text-[30px]`, `h-[56px]`) compile to
 * static styles and cannot call these functions. Apply scaling through inline
 * `style={{ fontSize: fs(30), height: s(56) }}` on the size-critical values,
 * and keep flex / SafeAreaView / percentages for structure.
 */

const { width, height } = Dimensions.get('window');

// Reference frame the driver designs were built on (Figma canvas).
const GUIDELINE_BASE_WIDTH = 392;
const GUIDELINE_BASE_HEIGHT = 851;

// Use the short/long edge rather than raw width/height so the math is stable
// regardless of orientation (these screens are portrait, but this keeps the
// helper reusable elsewhere).
const shortEdge = Math.min(width, height);
const longEdge = Math.max(width, height);

export const s = (size: number): number => (shortEdge / GUIDELINE_BASE_WIDTH) * size;

export const vs = (size: number): number => (longEdge / GUIDELINE_BASE_HEIGHT) * size;

export const ms = (size: number, factor = 0.5): number =>
  size + (s(size) - size) * factor;

export const fs = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel(ms(size, 0.3)));
