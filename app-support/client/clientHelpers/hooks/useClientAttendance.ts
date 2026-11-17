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

export type ClientAttendanceHistoryItem = {
  id: string;
  childId: string;
  childName: string;
  date: string;
  status: ClientAttendanceStatus;
  reason?: string | null;
  reportStatus?: string | null;
  arrivalTime?: string | null;
};

export const getClientDate = (value = new Date()) =>
  [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

export const useClientAttendance = (selectedDate = getClientDate()) => {
  const { user } = useContext(AuthContext);
  const date = selectedDate;
  const userId = user?.userData?.id || user?.id;
  const cacheKey = userId ? `clientAttendance:${userId}:${date}` : null;
  const [attendance, setAttendance] = useState<ClientAttendanceItem[]>([]);
  const [history, setHistory] = useState<ClientAttendanceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAttendance = useCallback(async () => {
    if (!user?.token) {
      setAttendance([]);
      setHistory([]);
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
      const reportsByDate = new Map<string, any>();
      (data.absenceReports || []).forEach((report: any) => {
        const key = `${report.child_id}:${report.absence_date}`;
        if (!reportsByDate.has(key)) reportsByDate.set(key, report);
      });
      const childNames = new Map<string, string>(
        (data.children || []).map((child: any) => [
          child.id,
          [child.name, child.lastname].filter(Boolean).join(" "),
        ]),
      );
      const next = (data.children || []).map((child: any) => {
        const record = records.get(child.id);
        const report = reportsByDate.get(`${child.id}:${date}`);
        return {
          childId: child.id,
          childName: [child.name, child.lastname].filter(Boolean).join(" "),
          status: report ? "absent" : record?.status || "not_recorded",
          arrivalTime: record?.arrival_time || null,
          schoolName: child.schools?.name || "School",
          schoolStartTime: child.schools?.start_time || null,
          schoolEndTime: child.schools?.end_time || null,
        };
      });
      const historyByDate = new Map<string, ClientAttendanceHistoryItem>();
      (data.history || []).forEach((record: any) => {
        const key = `${record.child_id}:${record.attendance_date}`;
        const report = reportsByDate.get(key);
        historyByDate.set(key, {
          id: record.id,
          childId: record.child_id,
          childName: childNames.get(record.child_id) || "Child",
          date: record.attendance_date,
          status: report ? "absent" : record.status,
          reason: report?.reason || null,
          reportStatus: report?.status || null,
          arrivalTime: record.arrival_time || null,
        });
      });
      (data.absenceReports || []).forEach((report: any) => {
        const key = `${report.child_id}:${report.absence_date}`;
        const existing = historyByDate.get(key);
        historyByDate.set(key, {
          id: existing?.id || report.id,
          childId: report.child_id,
          childName: childNames.get(report.child_id) || "Child",
          date: report.absence_date,
          status: "absent",
          reason: report.reason,
          reportStatus: report.status,
          arrivalTime: existing?.arrivalTime || null,
        });
      });
      const nextHistory = Array.from(historyByDate.values()).sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      if (cacheKey) {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ attendance: next, history: nextHistory }),
        );
      }
      setAttendance(next);
      setHistory(nextHistory);
    } catch (error) {
      console.error("Error loading client attendance:", error);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, date, user]);

  useEffect(() => {
    let active = true;
    const hydrateAndRefresh = async () => {
      if (cacheKey) {
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached && active) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setAttendance(parsed);
            } else {
              setAttendance(
                Array.isArray(parsed.attendance) ? parsed.attendance : [],
              );
              setHistory(
                Array.isArray(parsed.history) ? parsed.history : [],
              );
            }
            setLoading(false);
          }
        } catch (error) {
          console.error("Failed to load client attendance cache:", error);
        }
      }
      if (active) void loadAttendance();
    };

    setAttendance([]);
    setHistory([]);
    void hydrateAndRefresh();
    return () => {
      active = false;
    };
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
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "absence_reports" },
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

  return { attendance, history, loading, reload: loadAttendance };
};
