import { createContext } from "react";

export type SchoolBillingAccess = {
  trialExpired: boolean;
  loading: boolean;
};

export const SchoolBillingAccessContext = createContext<SchoolBillingAccess>({
  trialExpired: false,
  loading: true,
});

export const EXPIRED_TRIAL_SAFETY_TABS = new Set([
  "index",
  "students",
  "routes",
  "trips",
  "messages",
]);

export const isSchoolTrialExpiredWithoutPaidSubscription = (billing: {
  trial?: { status?: string } | null;
  subscription?: {
    billing_status?: string;
    grace_period_ends_at?: string | null;
    current_period_end?: string | null;
  } | null;
}) => {
  if (billing.trial?.status !== "expired") return false;

  const subscription = billing.subscription;
  if (!subscription) return true;
  if (subscription.billing_status === "active") return false;
  if (
    subscription.billing_status === "past_due" &&
    subscription.grace_period_ends_at &&
    new Date(subscription.grace_period_ends_at).getTime() > Date.now()
  ) {
    return false;
  }
  return !(
    subscription.billing_status === "canceled" &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() > Date.now()
  );
};
