const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const appJson = require('./app.json');

const extra = (appJson.expo && appJson.expo.extra) ? { ...appJson.expo.extra } : {};

// Inject Geoapify API key from .env into Expo extra so Constants.expoConfig.extra has it
if (process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY) {
  extra.EXPO_PUBLIC_GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
}

module.exports = ({ config }) => {
  return {
    ...config,
    extra,
  };
};
