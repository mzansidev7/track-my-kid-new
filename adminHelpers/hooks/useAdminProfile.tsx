import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../url";

type AdminProfile = {
  id: string;
  name?: string | null;
  display_name?: string | null;
  email?: string | null;
  admin_role?: string;
  role: "admin";
};

export const useAdminProfile = () => {
  const { user } = useContext(AuthContext);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminProfile = useCallback(async () => {
    if (!user?.token || user?.role !== "admin") {
      setAdmin(null);
      setError("An active platform Admin account is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/admin/profile`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const result = await response.json();
      if (!response.ok || !result?.admin) {
        throw new Error(result?.error || "Unable to load Admin profile.");
      }
      setAdmin(result.admin as AdminProfile);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load Admin profile.",
      );
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.token]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchAdminProfile(), 0);
    return () => clearTimeout(timer);
  }, [fetchAdminProfile]);

  return { admin, loading, error, refreshAdmin: fetchAdminProfile };
};
