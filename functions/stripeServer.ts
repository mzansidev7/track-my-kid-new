import { BASE_URL } from "../url";

export const fetchPaymentSummary = async (token: string) => {
  const res = await fetch(`${BASE_URL}/client/payments/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch payment summary");
  return data;
};

export const createCheckoutSession = async (token: string) => {
  const res = await fetch(`${BASE_URL}/client/payments/checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Failed to create checkout session");
  return data;
};
