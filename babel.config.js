module.exports = api => ({
  presets: [
    ['module:@react-native/babel-preset', { unstable_transformProfile: 'hermes-stable' }],
    'nativewind/babel',
  ],
  plugins: [
    // Jest runs CommonJS; transform deferred service imports for logout tests.
    ...(api.caller(caller => caller?.name === 'babel-jest') ? ['@babel/plugin-transform-dynamic-import'] : []),
    'react-native-worklets/plugin',
  ],
});
