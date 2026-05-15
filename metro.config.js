const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Needed so that the Firebase JS SDK resolves correctly under Metro / RN 0.76+
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
