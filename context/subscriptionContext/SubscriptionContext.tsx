import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "../../context/authContext/auth-context";
import { client } from "@/supabaseConfig/supabaseConfig";

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;

  monthly_price_cents: number;
  annual_price_cents: number;

  driver_limit: number | null;
  vehicle_limit: number | null;
  route_limit: number | null;

  has_basic_reports: boolean;
  has_full_analytics: boolean;
  has_priority_support: boolean;
}

export interface OwnerSubscription {
  id: string;
  owner_id: string;
  plan_id: string;

  billing_interval: "monthly" | "annual";

  status: "active" | "past_due" | "canceled" | "trialing" | "paused";

  price_cents: number;
  currency: string;

  current_period_start: string | null;
  current_period_end: string | null;

  auto_renew: boolean;

  subscription_plans: SubscriptionPlan;
}

interface SubscriptionContextType {
  subscription: OwnerSubscription | null;
  loading: boolean;

  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth(); // Whatever contains the owner id
  const ownerId = user?.userData?.id || user?.id;

  const [subscription, setSubscription] = useState<OwnerSubscription | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  const refreshSubscription = async () => {
    if (!ownerId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await client
        .from("owner_subscriptions")
        .select(
          `
          *,
          subscription_plans (*)
        `,
        )
        .eq("owner_id", ownerId)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSubscription(data);
        return;
      }

      const { data: freePlan, error: freePlanError } = await client
        .from("subscription_plans")
        .select("*")
        .eq("slug", "free")
        .maybeSingle();

      if (freePlanError) throw freePlanError;

      if (freePlan) {
        setSubscription({
          id: `free-fallback-${ownerId}`,
          owner_id: ownerId,
          plan_id: freePlan.id,
          billing_interval: "monthly",
          status: "active",
          price_cents: 0,
          currency: "zar",
          current_period_start: null,
          current_period_end: null,
          auto_renew: false,
          subscription_plans: freePlan,
        });
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error("Failed to load subscription:", err);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSubscription();
  }, [ownerId]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error(
      "useSubscription must be used within SubscriptionProvider.",
    );
  }

  return context;
};
