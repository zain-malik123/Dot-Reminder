const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidComponentFactoryOverride(config) {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application[0];

    if (!mainApplication.$) {
      mainApplication.$ = {};
    }

    // Add the tools namespace if it doesn't exist
    if (!mainApplication.$['xmlns:tools']) {
      mainApplication.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Add the tools:replace attribute to resolve the conflict
    mainApplication.$['tools:replace'] = 'android:appComponentFactory';
    
    // Also specify the value to use for the component factory
    mainApplication.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';

    return config;
  });
};