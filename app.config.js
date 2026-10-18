const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const appJson = require("./app.json");

const baseExpo = appJson.expo || {};

const extra = {
  ...(baseExpo.extra || {}),
};

if (process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY) {
  extra.EXPO_PUBLIC_GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
}

if (process.env.EXPO_PUBLIC_GOOGLE_API_KEY) {
  extra.EXPO_PUBLIC_GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
}

module.exports = ({ config }) => {
  const merged = {
    ...baseExpo,
    ...config,
  };

  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

  const android = { ...(merged.android || {}) };
  const ios = { ...(merged.ios || {}) };

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
    ...merged,
    android,
    ios,
    extra,
    plugins: [
      ...(merged.plugins || []),
      "expo-asset",
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
  };
};
