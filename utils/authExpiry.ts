import axios from "axios";

type ExpiryHandler = () => void | Promise<void>;

let expiryHandler: ExpiryHandler | null = null;
let lastExpiredToken: string | null = null;
let fetchInterceptorInstalled = false;
let axiosInterceptorInstalled = false;

const getBearerToken = (headers: unknown): string | null => {
  if (!headers) return null;

  if (
    typeof (headers as { get?: (name: string) => unknown }).get === "function"
  ) {
    const value = (headers as { get: (name: string) => unknown }).get(
      "Authorization",
    );
    return typeof value === "string" ? value.replace(/^Bearer\s+/i, "") : null;
  }

  if (Array.isArray(headers)) {
    const entry = headers.find(
      ([name]) => String(name).toLowerCase() === "authorization",
    );
    return typeof entry?.[1] === "string"
      ? entry[1].replace(/^Bearer\s+/i, "")
      : null;
  }

  const record = headers as Record<string, unknown>;
  const key = Object.keys(record).find(
    (name) => name.toLowerCase() === "authorization",
  );
  const value = key ? record[key] : null;
  return typeof value === "string" ? value.replace(/^Bearer\s+/i, "") : null;
};

const isPublicAuthRequest = (url: unknown) =>
  /\/(login|create-user|verify-otp|resend-otp|request-registration-link|health)(?:[?#]|$)/i.test(
    String(url || ""),
  );

const notifyExpiredSession = (token: string | null) => {
  if (!expiryHandler || !token || token === lastExpiredToken) return;
  lastExpiredToken = token;
  void Promise.resolve(expiryHandler()).catch((error) => {
    console.error("Failed to handle expired session:", error);
  });
};

export const installAuthExpiryHandler = (handler: ExpiryHandler) => {
  expiryHandler = handler;

  if (!fetchInterceptorInstalled && typeof globalThis.fetch === "function") {
    const originalFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url =
        typeof input === "string" || input instanceof URL
          ? String(input)
          : input.url;
      const token =
        getBearerToken(init?.headers) ||
        getBearerToken(
          typeof input === "object" && "headers" in input
            ? input.headers
            : null,
        );
      const response = await originalFetch(input, init);

      if (response.ok && isPublicAuthRequest(url)) {
        lastExpiredToken = null;
      }

      if (response.status === 401 && token && !isPublicAuthRequest(url)) {
        notifyExpiredSession(token);
      }

      return response;
    }) as typeof globalThis.fetch;
    fetchInterceptorInstalled = true;
  }

  if (!axiosInterceptorInstalled) {
    axios.interceptors.response.use(
      (response) => {
        if (
          response.status >= 200 &&
          response.status < 300 &&
          isPublicAuthRequest(response.config?.url)
        ) {
          lastExpiredToken = null;
        }
        return response;
      },
      (error) => {
        const config = error?.config;
        const token = getBearerToken(config?.headers);
        if (
          error?.response?.status === 401 &&
          token &&
          !isPublicAuthRequest(config?.url)
        ) {
          notifyExpiredSession(token);
        }
        return Promise.reject(error);
      },
    );
    axiosInterceptorInstalled = true;
  }
};
