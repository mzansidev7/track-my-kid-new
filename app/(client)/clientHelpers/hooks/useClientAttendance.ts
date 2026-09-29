import { useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../../../../context/authContext/auth-context";
import { client } from "../../../../supabaseConfig/supabaseConfig";
import { resolveWorkingBaseUrl } from "../../../../url";

export type ClientAttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "not_recorded";

export type ClientAttendanceItem = {
  childId: string;
  childName: string;
  status: ClientAttendanceStatus;
  arrivalTime?: string | null;
  schoolName?: string;
  schoolStartTime?: string | null;
  schoolEndTime?: string | null;
};

export const getClientDate = (value = new Date()) =>
  [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

export const useClientAttendance = (selectedDate = getClientDate()) => {
  const { user } = useContext(AuthContext);
  const date = selectedDate;
  const cacheKey = `clientAttendance:${user?.userData?.id || "current"}:${date}`;
  const [attendance, setAttendance] = useState<ClientAttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAttendance = useCallback(async () => {
    if (!user?.token) {
      setAttendance([]);
      setLoading(false);
      return;
    }

    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/client/attendance?date=${date}`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      if (!response.ok) throw new Error("Unable to load attendance");
      const data = await response.json();
      const records = new Map<string, any>(
        (data.records || []).map((record: any) => [record.child_id, record]),
      );
      const next = (data.children || []).map((child: any) => {
        const record = records.get(child.id);
        return {
          childId: child.id,
          childName: [child.name, child.lastname].filter(Boolean).join(" "),
          status: record?.status || "not_recorded",
          arrivalTime: record?.arrival_time || null,
          schoolName: child.schools?.name || "School",
          schoolStartTime: child.schools?.start_time || null,
          schoolEndTime: child.schools?.end_time || null,
        };
      });
      await AsyncStorage.setItem(cacheKey, JSON.stringify(next));
      setAttendance(next);
    } catch (error) {
      console.error("Error loading client attendance:", error);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, date, user?.token]);

  useEffect(() => {
    AsyncStorage.getItem(cacheKey)
      .then((cached) => {
        if (cached) setAttendance(JSON.parse(cached));
      })
      .finally(() => loadAttendance());
  }, [cacheKey, loadAttendance]);

  useEffect(() => {
    const userId = user?.userData?.id || user?.id;
    if (!client || !user?.token || !userId) return undefined;

    let active = true;
    const channel = client.channel(
      `client-attendance-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance_records" },
        () => {
          if (active) void loadAttendance();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "children" },
        () => {
          if (active) void loadAttendance();
        },
      );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("Client attendance realtime unavailable:", status);
      }
    });

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [loadAttendance, user?.id, user?.token, user?.userData?.id]);

  return { attendance, loading, reload: loadAttendance };
};
