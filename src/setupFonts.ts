import React from 'react';
import { Text, TextInput } from 'react-native';

/**
 * Make Poppins the app-wide default font.
 *
 * We override the forwardRef `.render` of <Text>/<TextInput> to inject a
 * default `fontFamily: 'Poppins-Regular'` BEFORE each element's own style, so:
 *   - all text renders in Poppins by default (matches the Figma design), and
 *   - any element that sets its own fontFamily (weight classes like
 *     `font-poppins-semibold`, or icon fonts) still wins because its style is
 *     merged last.
 *
 * `.render` override is used instead of `defaultProps` because React 19
 * removed defaultProps support for function components. Import this once from
 * index.js before AppRegistry.registerComponent.
 */
const DEFAULT_FONT = 'Poppins-Regular';

function applyDefaultFont(Component: any): void {
  if (!Component || Component.__poppinsPatched) return;
  const original = Component.render;
  if (typeof original !== 'function') return;
  Component.render = function patchedRender(...args: any[]) {
    const element = original.apply(this, args);
    if (!element) return element;
    return React.cloneElement(element, {
      style: [{ fontFamily: DEFAULT_FONT }, element.props?.style],
    });
  };
  Component.__poppinsPatched = true;
}

applyDefaultFont(Text);
applyDefaultFont(TextInput);
