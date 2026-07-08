const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer/react-native'),
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
    // Keep Metro's file watcher out of the Android/iOS native build output.
    // On Windows (no Watchman) the fallback watcher walks these dirs and
    // crashes with ENOENT when Gradle deletes transient CMake temp folders.
    // Matches both path separators so it works on Windows and POSIX.
    blockList: /[/\\]android[/\\](\.gradle|build|app[/\\](build|\.cxx))[/\\].*|[/\\]ios[/\\]build[/\\].*/,
  },
};

module.exports = withNativeWind(mergeConfig(defaultConfig, config), {
  input: './global.css',
  // Metro 0.84 (RN 0.85) changed the file-system API; NativeWind's in-memory
  // virtual-module patching (fs.getSha1) crashes. Force it to write CSS output
  // to disk instead, which avoids the incompatible code path.
  forceWriteFileSystem: true,
});
