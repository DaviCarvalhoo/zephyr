// Reanimated requires its worklets plugin to be the LAST entry in plugins.
// We keep it isolated here so future additions don't accidentally append after it.

module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: ['react-native-worklets/plugin']
    };
};
