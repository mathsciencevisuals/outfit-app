module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NOTE: expo-router/babel was merged into babel-preset-expo in SDK 50+.
    // Keeping it here causes "Cannot find module 'expo-router/babel'" errors
    // on clean installs and on Railway. Remove it.
  };
};
