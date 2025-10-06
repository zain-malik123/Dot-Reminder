const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withPackagingOptions(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    const packagingOptions = `
    packagingOptions {
        exclude 'META-INF/androidx.localbroadcastmanager_localbroadcastmanager.version'
    }
`;

    if (!buildGradle.includes('packagingOptions')) {
      config.modResults.contents = buildGradle.replace(/android\s?{/, `android {\n${packagingOptions}`);
    }

    return config;
  });
};