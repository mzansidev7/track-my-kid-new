import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../context/authContext/auth-context";
import {
  subscribeToClientChildrenAndSchoolsUpdates,
  unsubscribeFromRealtime,
} from "../../../../store/subscriptions/clientRealtime";
import {
  loadChildren,
  saveChildren,
} from "../../../../store/asyncStorage/clientCache";
import { resolveWorkingBaseUrl } from "../../../../url";

interface School {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  school_email?: string;
  created_at?: string;
  latitude?: number;
  longitude?: number;
  email?: string;
  start_time?: string;
  end_time?: string;
  contact_person?: string;
  is_active?: boolean;
  emis_number?: string;
  principal_name?: string;
  province?: string;
  logo?: string;
  status?: string;
  verified_at?: string;
  approved_at?: string;
  approved_by?: string;
  district?: string;
}

interface Child {
  id: string;
  name: string;
  lastname: string;
  grade: string;
  school_name: string;
  school_address?: string;
  school_id?: string;
  school_latitude?: number;
  school_longitude?: number;
  school_location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  school?: School;
  pickup_address?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  dropoff_address?: string;
  dropoff_latitude?: number;
  dropoff_longitude?: number;
  route?: {
    id?: string;
    route_name?: string;
    start_location?: string;
    end_location?: string;
    departure_time?: string;
    pickup_start_time?: string;
    pickup_end_time?: string;
    dropoff_start_time?: string;
    dropoff_end_time?: string;
    time_scope?: string;
    start_latitude?: number;
    start_longitude?: number;
    end_latitude?: number;
    end_longitude?: number;
  };
  vehicle_id?: string;
  vehicle?: {
    id: string;
    name: string;
    license_plate: string;
    driver?: {
      id?: string;
      name?: string;
      email?: string;
      phone?: string;
      avatar?: string | null;
      first_name?: string;
      last_name?: string;
    };
  };
  avatar?: string;
  status?: string;
  accent?: string;
  eta?: string;
}

export type { Child, School };

interface UseChildrenReturn {
  schools: School[];
  children: Child[];
  schoolsLoading: boolean;
  childrenLoading: boolean;
  schoolsError?: string;
  childrenError?: string;
  isWeekend: boolean;
  refetch: () => Promise<void>;
}

const isWeekendDay = (date: Date) => [0, 6].includes(date.getDay());

const getLocalDate = (value?: string) => {
  if (!value) return undefined;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return [parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
};

const applyWeekendRouteVisibility = (children: Child[], date = new Date()) => {
  if (!isWeekendDay(date)) return children;

  const today = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

  return children.map((child) => {
    const routeDate = getLocalDate(child.route?.departure_time);
    if (routeDate && routeDate === today) return child;

    return {
      ...child,
      route: undefined,
      status: "Weekend",
    };
  });
};

export const useChildren = (): UseChildrenReturn => {
  const { user } = useContext(AuthContext);

  const [schools, setSchools] = useState<School[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [schoolsError, setSchoolsError] = useState<string>();
  const [childrenError, setChildrenError] = useState<string>();
  const [isWeekend] = useState(() => isWeekendDay(new Date()));

  const fetchData = useCallback(async () => {
    if (!user?.token) return;

    const cachedChildren = await loadChildren();
    if (Array.isArray(cachedChildren)) {
      setChildren(applyWeekendRouteVisibility(cachedChildren));
    }

    const baseUrl = await resolveWorkingBaseUrl();

    // Fetch schools
    setSchoolsLoading(true);
    setSchoolsError(undefined);
    let schoolList: School[] = [];
    try {
      const response = await fetch(`${baseUrl}/client/schools`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      console.log({ schools: data });
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to load schools.",
        );
      }

      schoolList = Array.isArray(data)
        ? data
        : Array.isArray(data?.schools)
          ? data.schools
          : [];

      setSchools(schoolList);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch schools";
      setSchoolsError(errorMessage);
      console.error("Fetch schools error:", error);
    } finally {
      setSchoolsLoading(false);
    }

    const schoolsById = new Map(
      schoolList.map((school) => [school.id, school]),
    );

    // Fetch children
    setChildrenLoading(true);
    setChildrenError(undefined);
    try {
      const response = await fetch(`${baseUrl}/client/children`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to load children.",
        );
      }

      const childrenList = (Array.isArray(data) ? data : []).map((child) => ({
        ...child,
        school: schoolsById.get(child.school_id),
      }));
      const visibleChildren = applyWeekendRouteVisibility(childrenList);
      setChildren(visibleChildren);
      await saveChildren(visibleChildren);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch children";
      setChildrenError(errorMessage);
      console.error("Fetch children error:", error);
    } finally {
      setChildrenLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!user?.token) return;

    const channel = subscribeToClientChildrenAndSchoolsUpdates(() => {
      fetchData();
    });

    return () => {
      if (channel) {
        unsubscribeFromRealtime(channel);
      }
    };
  }, [user?.token, fetchData]);

  return {
    schools,
    children,
    schoolsLoading,
    childrenLoading,
    schoolsError,
    childrenError,
    isWeekend,
    refetch: fetchData,
  };
};
