import { MaterialIcons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSchoolDashboard } from "@/app-support/school/schoolHelpers/hooks/useSchoolDashboard";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";

type StudentForm = {
  name: string;
  lastname: string;
  grade: string;
};

type StudentRecord = {
  id: string | number;
  name?: string | null;
  lastname?: string | null;
  grade?: string | null;
  className?: string | null;
  client_id?: string | number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  route_name?: string | null;
  avatar?: string | null;
  [key: string]: unknown;
};

type SchoolPlan = {
  slug: string;
  name: string;
  learner_limit: number | null;
};

type BillingData = {
  plans?: SchoolPlan[];
  subscription?: {
    status?: string;
    plan_slug?: string;
    current_period_end?: string | null;
    grace_period_ends_at?: string | null;
  } | null;
  trial?: {
    included_plan_slug?: string;
    starter_learner_limit?: number;
  };
};

type StudentRow = StudentRecord & {
  displayName: string;
  displayId: string;
  parentName: string;
  parentPhone: string;
  displayStatus: "Active" | "Inactive";
  transport: string;
};

const PAGE_SIZE = 5;
const EMPTY_FORM: StudentForm = { name: "", lastname: "", grade: "" };

const studentName = (student: StudentRecord) =>
  [student.name, student.lastname].filter(Boolean).join(" ") ||
  "Unnamed student";

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const toExcelCell = (value: unknown) =>
  `<Cell><Data ss:Type="String">${escapeHtml(value)}</Data></Cell>`;

const shareExportFile = async (
  uri: string,
  options: { mimeType: string; dialogTitle: string },
) => {
  let sharing: typeof import("expo-sharing");
  try {
    sharing = await import("expo-sharing");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Cannot find native module 'ExpoSharing'")
    ) {
      throw new Error(
        "The installed Android app does not include the Expo Sharing native module. Rebuild and reinstall the app, then try again.",
      );
    }
    throw error;
  }

  if (!(await sharing.isAvailableAsync())) {
    throw new Error("File sharing is unavailable on this device.");
  }
  await sharing.shareAsync(uri, options);
};

const Students = () => {
  const { user } = useContext(AuthContext);
  const { school, students, parents, loading, error, refresh } =
    useSchoolDashboard();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [gradeFilter, setGradeFilter] = useState("All grades");
  const [sort, setSort] = useState("name-asc");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(
    null,
  );
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState("");
  const [billingCheckedAt, setBillingCheckedAt] = useState(0);

  const loadBilling = useCallback(async () => {
    if (!user?.token) {
      setBillingLoading(false);
      return;
    }
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/school/billing`, {
        headers: { Authorization: "Bearer " + user.token },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load learner plan details.");
      }
      setBilling(data as BillingData);
      setBillingError("");
      setBillingCheckedAt(Date.now());
    } catch (requestError) {
      console.error("Could not load school student plan:", requestError);
      setBilling(null);
      setBillingError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load learner plan details.",
      );
    } finally {
      setBillingLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void loadBilling();
    }, [loadBilling, refresh]),
  );

  const subscription = billing?.subscription;
  const activeSubscription =
    (subscription?.status === "active" &&
      (!subscription.current_period_end ||
        new Date(subscription.current_period_end).getTime() >
          billingCheckedAt)) ||
    (subscription?.status === "past_due" &&
      Boolean(
        subscription.grace_period_ends_at &&
          new Date(subscription.grace_period_ends_at).getTime() >
            billingCheckedAt,
      )) ||
    (subscription?.status === "canceled" &&
      Boolean(
        subscription.current_period_end &&
          new Date(subscription.current_period_end).getTime() >
            billingCheckedAt,
      ));
  const planSlug = activeSubscription
    ? subscription?.plan_slug
    : billing?.trial?.included_plan_slug || "starter";
  const currentPlan = billing?.plans?.find((plan) => plan.slug === planSlug);
  const learnerLimit =
    currentPlan?.learner_limit ??
    (planSlug === "enterprise"
      ? null
      : (billing?.trial?.starter_learner_limit ?? 250));

  const studentRows = useMemo<StudentRow[]>(
    () =>
      students.map((student: StudentRecord) => {
        const parent = parents.find(
          (candidate: any) =>
            String(candidate.id) === String(student.client_id),
        );
        return {
          ...student,
          displayName: studentName(student),
          displayId: `STU-${String(student.id).slice(-4).toUpperCase()}`,
          parentName:
            [parent?.first_name, parent?.last_name].filter(Boolean).join(" ") ||
            parent?.users?.name ||
            "No guardian linked",
          parentPhone:
            parent?.phone || parent?.users?.phone || "No phone number",
          displayStatus: student.is_active === false ? "Inactive" : "Active",
          transport: student.route_name || "Not assigned",
        };
      }),
    [parents, students],
  );

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return studentRows.filter((student) => {
      const searchable = [
        student.displayName,
        student.displayId,
        student.grade,
        student.parentName,
        student.parentPhone,
        student.transport,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        searchable.includes(normalizedQuery) &&
        (statusFilter === "All statuses" ||
          student.displayStatus === statusFilter) &&
        (gradeFilter === "All grades" || student.grade === gradeFilter)
      );
    });
  }, [gradeFilter, query, statusFilter, studentRows]);

  const grades = useMemo(
    () =>
      [...new Set(studentRows.map((student) => student.grade).filter(Boolean))]
        .map(String)
        .sort((first, second) =>
          first.localeCompare(second, undefined, { sensitivity: "base" }),
        ),
    [studentRows],
  );

  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents];
    sorted.sort((first, second) => {
      if (sort === "newest" || sort === "oldest") {
        const firstTime = new Date(first.created_at || 0).getTime();
        const secondTime = new Date(second.created_at || 0).getTime();
        return sort === "newest"
          ? secondTime - firstTime
          : firstTime - secondTime;
      }
      const nameOrder = first.displayName.localeCompare(
        second.displayName,
        undefined,
        { sensitivity: "base" },
      );
      return sort === "name-desc" ? -nameOrder : nameOrder;
    });
    return sorted;
  }, [filteredStudents, sort]);

  const pageCount = Math.max(1, Math.ceil(sortedStudents.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleStudents = sortedStudents.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const activeCount = studentRows.filter(
    (student) => student.displayStatus === "Active",
  ).length;
  const unassignedCount = studentRows.filter(
    (student) => student.transport === "Not assigned",
  ).length;
  const hasFilters =
    Boolean(query) ||
    statusFilter !== "All statuses" ||
    gradeFilter !== "All grades" ||
    sort !== "name-asc";

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      await loadBilling();
    } finally {
      setRefreshing(false);
    }
  };

  const closeForm = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingStudent(null);
    setForm(EMPTY_FORM);
  };

  const openAddForm = () => {
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditForm = (student: StudentRow) => {
    setEditingStudent(student);
    setForm({
      name: student.name || "",
      lastname: student.lastname || "",
      grade: student.grade || "",
    });
    setModalOpen(true);
  };

  const saveStudent = async () => {
    if (!form.name.trim()) {
      Alert.alert("First name required", "Enter the student's first name.");
      return;
    }
    if (!user?.token) {
      Alert.alert("Session expired", "Sign in again to manage students.");
      return;
    }

    const normalizeName = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, " ");
    const duplicate = studentRows.find(
      (student) =>
        String(student.id) !== String(editingStudent?.id || "") &&
        normalizeName(`${student.name || ""} ${student.lastname || ""}`) ===
          normalizeName(`${form.name} ${form.lastname}`),
    );
    if (duplicate) {
      const keepBoth = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Possible duplicate student",
          `${duplicate.displayName} already exists. Keep both records?`,
          [
            { text: "Same child", style: "cancel", onPress: () => resolve(false) },
            { text: "Keep both", onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        );
      });
      if (!keepBoth) return;
    }

    setSaving(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const isEditing = Boolean(editingStudent);
      const response = await fetch(
        isEditing
          ? `${baseUrl}/school/students/${editingStudent?.id}`
          : `${baseUrl}/school/students`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            Authorization: "Bearer " + user.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            lastname: form.lastname.trim(),
            grade: form.grade.trim(),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (data.error === "SCHOOL_LEARNER_LIMIT_REACHED") {
          const limit = Number(data.learner_limit || learnerLimit || 250);
          throw new Error(
            `Your ${currentPlan?.name || planSlug || "current"} plan allows up to ${limit.toLocaleString()} learners. Upgrade your subscription in Billing to add more.`,
          );
        }
        throw new Error(
          data.error === "STUDENT_NAME_REQUIRED"
            ? "Enter the student's first name."
            : data.error || "Unable to save student.",
        );
      }
      setModalOpen(false);
      setEditingStudent(null);
      setForm(EMPTY_FORM);
      await refresh();
      Alert.alert(
        isEditing ? "Student updated" : "Student added",
        `${data.name || form.name.trim()} was ${isEditing ? "updated" : "added"} successfully.`,
      );
    } catch (requestError) {
      Alert.alert(
        "Unable to save student",
        requestError instanceof Error
          ? requestError.message
          : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = (student: StudentRow) => {
    Alert.alert(
      `Delete ${student.displayName}?`,
      "This student will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void confirmDeleteStudent(student),
        },
      ],
    );
  };

  const confirmDeleteStudent = async (student: StudentRow) => {
    if (!user?.token) {
      Alert.alert("Session expired", "Sign in again to manage students.");
      return;
    }
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(
        `${baseUrl}/school/students/${student.id}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer " + user.token },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to delete student.");
      }
      await refresh();
      Alert.alert("Student deleted", `${student.displayName} was deleted.`);
    } catch (requestError) {
      Alert.alert(
        "Unable to delete student",
        requestError instanceof Error
          ? requestError.message
          : "Please try again.",
      );
    }
  };

  const exportRows = useMemo(
    () =>
      sortedStudents.map((student) => [
        student.displayName,
        student.displayId,
        student.grade || "Grade not assigned",
        student.parentName,
        student.parentPhone,
        student.transport,
        student.displayStatus,
      ]),
    [sortedStudents],
  );
  const exportColumns = [
    "Student",
    "ID",
    "Grade",
    "Guardian",
    "Phone",
    "Transport",
    "Status",
  ];

  const exportExcel = async () => {
    if (!sortedStudents.length) {
      Alert.alert("Nothing to export", "No students match the current filters.");
      return;
    }
    setExporting("excel");
    try {
      const schoolInfo = school || {};
      const rows = [
        [schoolInfo.name || "School students"],
        ["EMIS number", schoolInfo.emis_number || "Not available"],
        ["Address", schoolInfo.address || "Not available"],
        ["Phone", schoolInfo.phone || "Not available"],
        ["Email", schoolInfo.school_email || "Not available"],
        ["Principal", schoolInfo.principal_name || "Not available"],
        [],
        ["Total students", studentRows.length],
        ["Active students", activeCount],
        ["Without transport", unassignedCount],
        [],
        exportColumns,
        ...exportRows,
      ];
      const workbook = `<?xml version="1.0"?>
        <?mso-application progid="Excel.Sheet"?>
        <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
          <Worksheet ss:Name="Students">
            <Table>${rows
              .map(
                (row) =>
                  `<Row>${row.map(toExcelCell).join("")}</Row>`,
              )
              .join("")}</Table>
          </Worksheet>
        </Workbook>`;
      const file = new File(
        Paths.cache,
        `school-students-${Date.now()}.xls`,
      );
      file.write(workbook);
      await shareExportFile(file.uri, {
        mimeType: "application/vnd.ms-excel",
        dialogTitle: "Share student directory Excel file",
      });
    } catch (requestError) {
      Alert.alert(
        "Unable to export students",
        requestError instanceof Error
          ? requestError.message
          : "Please try again.",
      );
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async () => {
    if (!sortedStudents.length) {
      Alert.alert("Nothing to export", "No students match the current filters.");
      return;
    }
    setExporting("pdf");
    try {
      const schoolInfo = school || {};
      const htmlRows = exportRows
        .map(
          (row) =>
            `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`,
        )
        .join("");
      const { printToFileAsync } = await import("expo-print");
      const result = await printToFileAsync({
        html: `
          <html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: Arial, sans-serif; color: #172b4d; padding: 20px; }
            h1 { margin: 0 0 6px; font-size: 22px; }
            p { margin: 4px 0; color: #64748b; font-size: 11px; }
            .summary { margin: 16px 0; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; }
            th { background: #0f766e; color: white; text-align: left; }
            th, td { border: 1px solid #dce4eb; padding: 6px; }
            tr:nth-child(even) { background: #f7faff; }
          </style></head><body>
            <h1>${escapeHtml(schoolInfo.name || "School students")}</h1>
            <p>EMIS number: ${escapeHtml(schoolInfo.emis_number || "Not available")}</p>
            <p>Address: ${escapeHtml(schoolInfo.address || "Not available")}</p>
            <p>Phone: ${escapeHtml(schoolInfo.phone || "Not available")}</p>
            <p>Email: ${escapeHtml(schoolInfo.school_email || "Not available")}</p>
            <p>Principal: ${escapeHtml(schoolInfo.principal_name || "Not available")}</p>
            <p class="summary">Total: ${studentRows.length} · Active: ${activeCount} · Without transport: ${unassignedCount}</p>
            <table><thead><tr>${exportColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
            <tbody>${htmlRows}</tbody></table>
            <p>Exported ${escapeHtml(new Date().toLocaleString())}</p>
          </body></html>`,
      });
      await shareExportFile(result.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share student directory PDF",
      });
    } catch (requestError) {
      if (
        requestError instanceof Error &&
        requestError.message.includes("Cannot find native module 'ExpoPrint'")
      ) {
        Alert.alert(
          "PDF export unavailable",
          "The installed Android app does not include the Expo Print native module. Rebuild and reinstall the app, then try again.",
        );
        return;
      }
      if (
        requestError instanceof Error &&
        requestError.message.includes("Expo Sharing native module")
      ) {
        Alert.alert("File sharing unavailable", requestError.message);
        return;
      }
      Alert.alert(
        "Unable to export students",
        requestError instanceof Error
          ? requestError.message
          : "Please try again.",
      );
    } finally {
      setExporting(null);
    }
  };

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("All statuses");
    setGradeFilter("All grades");
    setSort("name-asc");
    setPage(1);
  };

  const setFilterPage = (update: () => void) => {
    update();
    setPage(1);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>SCHOOL DIRECTORY</Text>
            <Text style={styles.title}>Students</Text>
            <Text style={styles.subtitle}>
              Manage learner profiles, guardians, and transport.
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <MaterialIcons name="school" size={24} color="#16834A" />
          </View>
        </View>

        <View style={styles.planRow}>
          <MaterialIcons name="info-outline" size={16} color="#16834A" />
          <Text style={styles.planText}>
            {studentRows.length} learner{studentRows.length === 1 ? "" : "s"}
            {billingLoading
              ? " · Checking plan limit…"
              : learnerLimit !== null
                ? ` · ${learnerLimit?.toLocaleString()} learner limit on ${currentPlan?.name || planSlug || "Starter"} plan`
                : " · Unlimited learners on Enterprise"}
          </Text>
          {learnerLimit !== null && (
            <Text style={styles.planCount}>
              {studentRows.length}/{learnerLimit}
            </Text>
          )}
        </View>
        {billingError ? (
          <Text style={styles.billingError}>
            Learner plan details are unavailable. The server will still enforce
            your school’s learner limit when adding a student.
          </Text>
        ) : null}
        {error && (
          <View style={styles.loadError}>
            <MaterialIcons name="cloud-off" size={17} color="#B91C1C" />
            <Text style={styles.loadErrorText}>
              Student data could not be refreshed. Pull down to retry.
            </Text>
          </View>
        )}

        <View style={styles.metrics}>
          <MetricCard
            icon="groups"
            label="Total students"
            value={studentRows.length}
            tone="green"
          />
          <MetricCard
            icon="person"
            label="Active students"
            value={activeCount}
            tone="blue"
          />
          <MetricCard
            icon="directions-bus"
            label="Without transport"
            value={unassignedCount}
            tone="amber"
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.exportButton, exporting !== null && styles.disabled]}
            onPress={() => void exportExcel()}
            disabled={exporting !== null}
          >
            {exporting === "excel" ? (
              <ActivityIndicator size="small" color="#334155" />
            ) : (
              <MaterialIcons name="table-view" size={17} color="#334155" />
            )}
            <Text style={styles.exportText}>Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, exporting !== null && styles.disabled]}
            onPress={() => void exportPdf()}
            disabled={exporting !== null}
          >
            {exporting === "pdf" ? (
              <ActivityIndicator size="small" color="#334155" />
            ) : (
              <MaterialIcons name="picture-as-pdf" size={17} color="#334155" />
            )}
            <Text style={styles.exportText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openAddForm}>
            <MaterialIcons name="add" size={19} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add student</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.directoryHeader}>
          <View>
            <Text style={styles.sectionTitle}>All students</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredStudents.length} of {studentRows.length} shown
            </Text>
          </View>
          {hasFilters && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={resetFilters}
              accessibilityRole="button"
            >
              <MaterialIcons name="filter-alt-off" size={16} color="#475569" />
              <Text style={styles.clearButtonText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#94A3B8" />
          <TextInput
            value={query}
            onChangeText={(value) => setFilterPage(() => setQuery(value))}
            placeholder="Search name, ID, grade, guardian…"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search students"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setFilterPage(() => setQuery(""))}
              accessibilityLabel="Clear search"
            >
              <MaterialIcons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {["All statuses", "Active", "Inactive"].map((option) => (
            <FilterChip
              key={option}
              label={
                option === "All statuses"
                  ? `All (${studentRows.length})`
                  : `${option} (${studentRows.filter((item) => item.displayStatus === option).length})`
              }
              selected={statusFilter === option}
              onPress={() => setFilterPage(() => setStatusFilter(option))}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {["All grades", ...grades].map((option) => (
            <FilterChip
              key={option}
              label={option}
              selected={gradeFilter === option}
              onPress={() => setFilterPage(() => setGradeFilter(option))}
            />
          ))}
        </ScrollView>

        <Text style={styles.sortLabel}>SORT BY</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {[
            ["name-asc", "Name A–Z"],
            ["name-desc", "Name Z–A"],
            ["newest", "Newest"],
            ["oldest", "Oldest"],
          ].map(([value, label]) => (
            <FilterChip
              key={value}
              label={label}
              selected={sort === value}
              onPress={() => setFilterPage(() => setSort(value))}
            />
          ))}
        </ScrollView>

        {loading && studentRows.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#16834A" />
            <Text style={styles.emptyText}>Loading student directory…</Text>
          </View>
        ) : visibleStudents.length ? (
          visibleStudents.map((student) => (
            <StudentCard
              key={String(student.id)}
              student={student}
              onEdit={() => openEditForm(student)}
              onDelete={() => deleteStudent(student)}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <MaterialIcons name="school" size={30} color="#94A3B8" />
            <Text style={styles.emptyTitle}>
              {studentRows.length
                ? "No students match these filters"
                : "No students yet"}
            </Text>
            <Text style={styles.emptyText}>
              {studentRows.length
                ? "Try changing your search or filters."
                : "Add a student to start building the school directory."}
            </Text>
            {!studentRows.length && (
              <TouchableOpacity style={styles.addButton} onPress={openAddForm}>
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add student</Text>
              </TouchableOpacity>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        )}

        {filteredStudents.length > 0 && (
          <View style={styles.pagination}>
            <Text style={styles.paginationCopy}>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredStudents.length)} of{" "}
              {filteredStudents.length}
            </Text>
            <View style={styles.paginationActions}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  safePage === 1 && styles.pageButtonDisabled,
                ]}
                disabled={safePage === 1}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
                accessibilityLabel="Previous page"
              >
                <MaterialIcons
                  name="chevron-left"
                  size={21}
                  color={safePage === 1 ? "#CBD5E1" : "#475569"}
                />
              </TouchableOpacity>
              <Text style={styles.pageNumber}>
                {safePage} / {pageCount}
              </Text>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  safePage === pageCount && styles.pageButtonDisabled,
                ]}
                disabled={safePage === pageCount}
                onPress={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
                accessibilityLabel="Next page"
              >
                <MaterialIcons
                  name="chevron-right"
                  size={21}
                  color={safePage === pageCount ? "#CBD5E1" : "#475569"}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.formSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.formHeader}>
              <View>
                <Text style={styles.formTitle}>
                  {editingStudent ? "Edit student" : "Add student"}
                </Text>
                <Text style={styles.formSubtitle}>
                  Enter the student’s school directory details.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeForm}
                disabled={saving}
                accessibilityLabel="Close student form"
              >
                <MaterialIcons name="close" size={21} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>First name *</Text>
            <TextInput
              value={form.name}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
              placeholder="First name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              autoCapitalize="words"
              accessibilityLabel="Student first name"
            />
            <Text style={styles.fieldLabel}>Last name</Text>
            <TextInput
              value={form.lastname}
              onChangeText={(lastname) =>
                setForm((current) => ({ ...current, lastname }))
              }
              placeholder="Last name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              autoCapitalize="words"
              accessibilityLabel="Student last name"
            />
            <Text style={styles.fieldLabel}>Grade / class</Text>
            <TextInput
              value={form.grade}
              onChangeText={(grade) =>
                setForm((current) => ({ ...current, grade }))
              }
              placeholder="e.g. Grade 9A, Class B"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              accessibilityLabel="Student grade or class"
            />
            <TouchableOpacity
              style={[styles.submitButton, saving && styles.disabled]}
              onPress={() => void saveStudent()}
              disabled={saving}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingStudent ? "Save changes" : "Add student"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const MetricCard = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value: number;
  tone: "green" | "blue" | "amber";
}) => (
  <View style={styles.metricCard}>
    <View
      style={[
        styles.metricIcon,
        tone === "green"
          ? styles.metricIcon_green
          : tone === "blue"
            ? styles.metricIcon_blue
            : styles.metricIcon_amber,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={18}
        color={
          tone === "green"
            ? "#16A34A"
            : tone === "blue"
              ? "#2563EB"
              : "#D97706"
        }
      />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const FilterChip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.filterChip, selected && styles.filterChipSelected]}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const StudentCard = ({
  student,
  onEdit,
  onDelete,
}: {
  student: StudentRow;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const initials =
    student.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S";

  return (
    <View style={styles.studentCard}>
      <View style={styles.studentHeader}>
        <View style={styles.studentIdentity}>
          <View style={styles.studentAvatar}>
            <Text style={styles.studentInitials}>{initials}</Text>
          </View>
          <View style={styles.studentTitleCopy}>
            <Text style={styles.studentName} numberOfLines={1}>
              {student.displayName}
            </Text>
            <Text style={styles.studentId}>{student.displayId}</Text>
          </View>
        </View>
        <View
          style={[
            styles.statusPill,
            student.displayStatus === "Active"
              ? styles.statusActive
              : styles.statusInactive,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              student.displayStatus === "Active"
                ? styles.statusActiveText
                : styles.statusInactiveText,
            ]}
          >
            {student.displayStatus}
          </Text>
        </View>
      </View>

      <View style={styles.studentDetails}>
        <DetailRow
          icon="class"
          label="Grade / class"
          value={student.grade || student.className || "Grade not assigned"}
        />
        <DetailRow icon="family-restroom" label="Guardian" value={student.parentName} />
        <DetailRow icon="phone" label="Contact" value={student.parentPhone} />
        <DetailRow
          icon="directions-bus"
          label="Transport"
          value={student.transport}
          warning={student.transport === "Not assigned"}
        />
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.cardAction}
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${student.displayName}`}
        >
          <MaterialIcons name="edit" size={16} color="#2563EB" />
          <Text style={styles.editActionText}>Edit</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity
          style={styles.cardAction}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${student.displayName}`}
        >
          <MaterialIcons name="delete-outline" size={17} color="#DC2626" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const DetailRow = ({
  icon,
  label,
  value,
  warning = false,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value: string;
  warning?: boolean;
}) => (
  <View style={styles.detailRow}>
    <MaterialIcons name={icon} size={16} color="#8291A5" />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text
      numberOfLines={1}
      style={[styles.detailValue, warning && styles.detailWarning]}
    >
      {value}
    </Text>
  </View>
);

export default Students;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F7FB" },
  content: { padding: 16, paddingBottom: 140 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: {
    color: "#16834A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { marginTop: 4, color: "#172033", fontSize: 27, fontWeight: "800" },
  subtitle: { marginTop: 4, color: "#64748B", fontSize: 12, lineHeight: 17 },
  headerIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#DCFCE7",
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 13,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  planText: { flex: 1, color: "#166534", fontSize: 10, lineHeight: 15 },
  planCount: { color: "#166534", fontSize: 10, fontWeight: "800" },
  billingError: {
    marginTop: -7,
    marginBottom: 12,
    color: "#B45309",
    fontSize: 10,
    lineHeight: 15,
  },
  loadError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
    padding: 10,
    borderRadius: 11,
    backgroundColor: "#FEF2F2",
  },
  loadErrorText: { flex: 1, color: "#B91C1C", fontSize: 10, lineHeight: 15 },
  metrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    minHeight: 104,
    padding: 11,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E7ECF3",
    backgroundColor: "#FFFFFF",
  },
  metricIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginBottom: 7,
  },
  metricIcon_green: { backgroundColor: "#DCFCE7" },
  metricIcon_blue: { backgroundColor: "#DBEAFE" },
  metricIcon_amber: { backgroundColor: "#FEF3C7" },
  metricValue: { color: "#172033", fontSize: 20, fontWeight: "800" },
  metricLabel: { marginTop: 2, color: "#64748B", fontSize: 9, lineHeight: 13 },
  actions: { flexDirection: "row", gap: 7, marginBottom: 20 },
  exportButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE4EB",
    backgroundColor: "#FFFFFF",
  },
  exportText: { color: "#334155", fontSize: 10, fontWeight: "700" },
  addButton: {
    minHeight: 42,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#16834A",
  },
  addButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  directoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  sectionTitle: { color: "#172033", fontSize: 17, fontWeight: "800" },
  sectionSubtitle: { marginTop: 3, color: "#64748B", fontSize: 11 },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#DCE4EB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  clearButtonText: { color: "#475569", fontSize: 10, fontWeight: "700" },
  searchBox: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E1E8EF",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  searchInput: { flex: 1, minHeight: 44, color: "#334155", fontSize: 12 },
  filterRow: { gap: 7, paddingBottom: 8, paddingRight: 16 },
  filterChip: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#E1E8EF",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  filterChipSelected: { borderColor: "#16834A", backgroundColor: "#EAF8EF" },
  filterChipText: { color: "#64748B", fontSize: 10, fontWeight: "600" },
  filterChipTextSelected: { color: "#16834A", fontWeight: "800" },
  sortLabel: {
    marginTop: 4,
    marginBottom: 5,
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  studentCard: {
    marginTop: 7,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E7ECF3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
    elevation: 1,
  },
  studentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
  },
  studentIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  studentAvatar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#E7F5EC",
  },
  studentInitials: { color: "#16834A", fontSize: 12, fontWeight: "800" },
  studentTitleCopy: { flex: 1 },
  studentName: { color: "#172033", fontSize: 13, fontWeight: "800" },
  studentId: { marginTop: 3, color: "#94A3B8", fontSize: 9, fontWeight: "600" },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  statusActive: { backgroundColor: "#DCFCE7" },
  statusInactive: { backgroundColor: "#F1F5F9" },
  statusText: { fontSize: 9, fontWeight: "800" },
  statusActiveText: { color: "#16834A" },
  statusInactiveText: { color: "#64748B" },
  studentDetails: { gap: 10, paddingVertical: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { width: 83, color: "#8291A5", fontSize: 10 },
  detailValue: { flex: 1, color: "#334155", fontSize: 10, fontWeight: "600" },
  detailWarning: { color: "#C2410C" },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 15,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F6",
  },
  cardAction: { flexDirection: "row", alignItems: "center", gap: 5 },
  editActionText: { color: "#2563EB", fontSize: 10, fontWeight: "700" },
  deleteActionText: { color: "#DC2626", fontSize: 10, fontWeight: "700" },
  actionDivider: { width: 1, height: 17, backgroundColor: "#E2E8F0" },
  loading: {
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  emptyCard: {
    alignItems: "center",
    marginTop: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E7ECF3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  emptyTitle: { marginTop: 10, color: "#334155", fontSize: 14, fontWeight: "800" },
  emptyText: {
    marginTop: 5,
    color: "#64748B",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  errorText: { marginTop: 10, color: "#B91C1C", fontSize: 10 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingVertical: 7,
  },
  paginationCopy: { color: "#64748B", fontSize: 10 },
  paginationActions: { flexDirection: "row", alignItems: "center", gap: 7 },
  pageButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCE4EB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  pageButtonDisabled: { backgroundColor: "#F8FAFC" },
  pageNumber: { color: "#475569", fontSize: 10, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },
  formSheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    marginBottom: 17,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 17,
  },
  formTitle: { color: "#172033", fontSize: 20, fontWeight: "800" },
  formSubtitle: { marginTop: 4, color: "#64748B", fontSize: 11 },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
  },
  fieldLabel: {
    marginBottom: 6,
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },
  input: {
    minHeight: 46,
    marginBottom: 13,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#DCE4EB",
    borderRadius: 12,
    color: "#172033",
    fontSize: 13,
  },
  submitButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    borderRadius: 13,
    backgroundColor: "#16834A",
  },
  submitButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
});
