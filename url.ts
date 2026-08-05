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
const LOCAL_API_HOST = "http://10.0.2.2:4000";

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
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
};

const fromEnvRaw =
  process.env.EXPO_PUBLIC_API_URL?.trim() || extra.EXPO_PUBLIC_API_URL?.trim();
const fromEnv = fromEnvRaw ? normalizeBaseUrl(fromEnvRaw) : undefined;

const shouldPreferLocalEmulatorHost = __DEV__ && Platform.OS === "android";

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

const localFallback =
  getDevHostUrl() ||
  (Platform.OS === "android" ? LOCAL_API_ANDROID : LOCAL_API_IOS);

const resolvedBaseUrl =
  fromEnv && fromEnv.length > 0 && !shouldPreferLocalEmulatorHost
    ? fromEnv
    : __DEV__
      ? shouldPreferLocalEmulatorHost
        ? LOCAL_API_HOST
        : localFallback
      : PRODUCTION_API;

const getCandidateUrls = () => {
  const candidates = new Set<string>();

  if (fromEnv && fromEnv.length > 0) {
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
    try {
      const response = await axios.get(
        `${candidate.replace(/\/$/, "")}/health`,
        {
          timeout: 1200,
        },
      );

      if (response?.status && response.status < 500) {
        return candidate.replace(/\/$/, "");
      }
    } catch {
      // Try the next candidate.
    }
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
