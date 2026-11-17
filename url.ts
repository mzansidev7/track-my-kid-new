import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * API base URL. Prefer `EXPO_PUBLIC_API_URL` in `.env` or via Expo config extra.
 * For local development, the app will prefer the value from the manifest if available.
 */
const PRODUCTION_API = "https://track-my-kid-server-production.up.railway.app";
const LOCAL_API_ANDROID = "http://10.0.2.2:4000";
const LOCAL_API_IOS = "http://localhost:4000";

const isValidBaseUrl = (value: unknown): value is string =>
  typeof value === "string" &&
  /^https?:\/\/[^/\s]+(?:\/.*)?$/i.test(value.trim()) &&
  !/^https?:\/\/(?:undefined|null)(?:[/:]|$)/i.test(value.trim());

const extra =
  ((Constants.expoConfig as any)?.extra as Record<
    string,
    string | undefined
  >) ||
  ((Constants.manifest as any)?.extra as Record<string, string | undefined>) ||
  {};

const normalizeBaseUrl = (url: string) => {
  const trimmed = url.trim();

  if (!trimmed) {
    return undefined;
  }

  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  return isValidBaseUrl(normalized) ? normalized.replace(/\/+$/, "") : undefined;
};

const fromEnvRaw =
  process.env.EXPO_PUBLIC_API_URL?.trim() || extra.EXPO_PUBLIC_API_URL?.trim();
const fromEnv =
  fromEnvRaw && fromEnvRaw.toLowerCase() !== "undefined"
    ? normalizeBaseUrl(fromEnvRaw)
    : undefined;

const getDevHostUrl = () => {
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants.manifest as any)?.debuggerHost;

  if (!hostUri) {
    return undefined;
  }

  const host = hostUri.split(":")[0];

  if (!host) {
    return undefined;
  }

  if (host === "localhost" || host === "127.0.0.1") {
    return Platform.OS === "android" ? LOCAL_API_ANDROID : LOCAL_API_IOS;
  }

  return `http://${host}:4000`;
};

const detectedDevHostUrl = getDevHostUrl();
const localFallback =
  detectedDevHostUrl && isValidBaseUrl(detectedDevHostUrl)
    ? detectedDevHostUrl
    : Platform.OS === "android"
      ? LOCAL_API_ANDROID
      : LOCAL_API_IOS;

const resolvedBaseUrl =
  fromEnv
    ? fromEnv
    : __DEV__
      ? localFallback
      : PRODUCTION_API;

const getCandidateUrls = () => {
  const candidates = new Set<string>();

  if (fromEnv) {
    candidates.add(fromEnv);
  }

  if (__DEV__) {
    candidates.add(LOCAL_API_ANDROID);
    candidates.add(LOCAL_API_IOS);
    candidates.add(localFallback);

    const devHostUrl = getDevHostUrl();
    if (devHostUrl) {
      candidates.add(devHostUrl);
    }
  }

  candidates.add(PRODUCTION_API);

  return Array.from(candidates);
};

export const BASE_URL = resolvedBaseUrl;
export const API_BASE_URL_CANDIDATES = getCandidateUrls();

export const resolveWorkingBaseUrl = async () => {
  for (const candidate of API_BASE_URL_CANDIDATES) {
    if (!isValidBaseUrl(candidate)) {
      continue;
    }

    try {
      const response = await axios.get(
        `${candidate}/health`,
        {
          timeout: 1200,
        },
      );

      if (response?.status && response.status < 500) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  if (!isValidBaseUrl(BASE_URL)) {
    throw new Error(
      "The API base URL is missing or invalid. Configure EXPO_PUBLIC_API_URL and restart the app.",
    );
  }
  return BASE_URL;
};

/** For logs / debugging only */
export const BASE_URL_SOURCE = fromEnvRaw
  ? "EXPO_PUBLIC_API_URL"
  : __DEV__
    ? "localhost-fallback"
    : "default-production";

export const DEBUG_API_CONFIG = {
  baseUrl: resolvedBaseUrl,
  source: BASE_URL_SOURCE,
  platform: Platform.OS,
  isDev: __DEV__,
  candidates: API_BASE_URL_CANDIDATES,
};

// Geoapify API key (EXPO_PUBLIC_ prefix so it's safe to embed in the app)
export const GEOAPIFY_API_KEY =
  process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY ||
  extra.EXPO_PUBLIC_GEOAPIFY_API_KEY ||
  "";

// Google Maps API key (EXPO_PUBLIC_ so it can be embedded safely)
export const GOOGLE_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_API_KEY ||
  extra.EXPO_PUBLIC_GOOGLE_API_KEY ||
  "";
