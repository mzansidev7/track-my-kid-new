const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const appJson = require("./app.json");

const extra =
  appJson.expo && appJson.expo.extra ? { ...appJson.expo.extra } : {};

// Inject Geoapify API key from .env into Expo extra so Constants.expoConfig.extra has it
if (process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY) {
  extra.EXPO_PUBLIC_GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
}
if (process.env.EXPO_PUBLIC_GOOGLE_API_KEY) {
  extra.EXPO_PUBLIC_GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
}

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
  const android = { ...(config.android || {}) };
  const ios = { ...(config.ios || {}) };

  if (googleMapsApiKey) {
    android.config = {
      ...(android.config || {}),
      googleMaps: {
        ...(android.config?.googleMaps || {}),
        apiKey: googleMapsApiKey,
      },
    };
    ios.config = {
      ...(ios.config || {}),
      googleMapsApiKey,
    };
  }

  return {
    ...config,
    android,
    ios,
    plugins: [
      ...(config.plugins || []),
      [
        "expo-audio",
        {
          microphonePermission:
            "Allow Track My Kid to record voice messages in conversations.",
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
    ],
    extra,
  };
};
