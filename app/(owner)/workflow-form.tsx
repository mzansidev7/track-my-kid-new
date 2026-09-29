import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../context/authContext/auth-context";
import { useOwnerPageHeader } from "./ownerHelpers/hooks/useOwnerPageHeader";
import { resolveWorkingBaseUrl } from "../../url";

type WorkflowCategory =
  | "dispatches"
  | "complianceDocuments"
  | "clientEnrollments"
  | "pricingAgreements"
  | "invoices"
  | "refunds"
  | "reconciliations";

type FieldDefinition = {
  key: string;
  label: string;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  defaultValue?: string;
  type?: "text" | "textarea" | "picker";
  options?: string[];
  helperText?: string;
  required?: boolean;
};

type WorkflowConfig = {
  title: string;
  endpoint: string;
  accent: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  fields: FieldDefinition[];
};

const WORKFLOW_CONFIG: Record<WorkflowCategory, WorkflowConfig> = {
  dispatches: {
    title: "Dispatches",
    endpoint: "dispatches",
    accent: "#2563EB",
    icon: "local-shipping",
    fields: [
      {
        key: "dispatch_label",
        label: "Dispatch label",
        placeholder: "School run",
      },
      {
        key: "dispatch_date",
        label: "Dispatch date",
        placeholder: "2026-09-15T08:00:00Z",
      },
      {
        key: "status",
        label: "Status",
        type: "picker",
        defaultValue: "scheduled",
        options: [
          "scheduled",
          "in_transit",
          "completed",
          "needs_attention",
          "cancelled",
        ],
      },
      {
        key: "route_id",
        label: "Route ID",
        placeholder: "Optional route UUID",
      },
      {
        key: "vehicle_id",
        label: "Vehicle ID",
        placeholder: "Optional vehicle UUID",
      },
      {
        key: "driver_id",
        label: "Driver ID",
        placeholder: "Optional driver UUID",
      },
      {
        key: "notes",
        label: "Notes",
        placeholder: "Any dispatch notes",
        type: "textarea",
        helperText: "Optional dispatch details for the team.",
      },
    ],
  },
  complianceDocuments: {
    title: "Compliance",
    endpoint: "compliance",
    accent: "#7C3AED",
    icon: "verified-user",
    fields: [
      {
        key: "document_type",
        label: "Document type",
        type: "picker",
        defaultValue: "general",
        options: [
          "general",
          "insurance",
          "license",
          "permit",
          "inspection",
          "incident",
        ],
      },
      {
        key: "title",
        label: "Title",
        placeholder: "Vehicle insurance",
        required: true,
      },
      {
        key: "status",
        label: "Status",
        type: "picker",
        defaultValue: "pending",
        options: ["pending", "review", "approved", "expired", "rejected"],
      },
      {
        key: "expires_at",
        label: "Expiry date",
        placeholder: "2026-09-15T00:00:00Z",
      },
      {
        key: "file_url",
        label: "File URL",
        placeholder: "Optional document URL",
      },
      {
        key: "notes",
        label: "Notes",
        placeholder: "Compliance notes",
        type: "textarea",
        helperText: "Document review notes or follow-up actions.",
      },
    ],
  },
  clientEnrollments: {
    title: "Client Enrollments",
    endpoint: "client-enrollments",
    accent: "#10B981",
    icon: "groups",
    fields: [
      {
        key: "client_id",
        label: "Client ID",
        placeholder: "Optional client UUID",
      },
      {
        key: "route_id",
        label: "Route ID",
        placeholder: "Optional route UUID",
      },
      {
        key: "status",
        label: "Status",
        type: "picker",
        defaultValue: "active",
        options: ["active", "pending", "paused", "inactive"],
      },
      {
        key: "start_date",
        label: "Start date",
        placeholder: "2026-09-15T00:00:00Z",
      },
      { key: "end_date", label: "End date", placeholder: "Optional end date" },
      {
        key: "notes",
        label: "Notes",
        placeholder: "Enrollment notes",
        type: "textarea",
        helperText: "Optional parent or route notes for this enrollment.",
      },
    ],
  },
  pricingAgreements: {
    title: "Pricing Agreements",
    endpoint: "pricing-agreements",
    accent: "#F59E0B",
    icon: "payments",
    fields: [
      {
        key: "agreement_name",
        label: "Agreement name",
        placeholder: "Monthly school run",
        required: true,
      },
      {
        key: "client_id",
        label: "Client ID",
        placeholder: "Optional client UUID",
      },
      {
        key: "route_id",
        label: "Route ID",
        placeholder: "Optional route UUID",
      },
      {
        key: "amount_cents",
        label: "Amount (cents)",
        keyboardType: "numeric",
        placeholder: "150000",
      },
      {
        key: "billing_cycle",
        label: "Billing cycle",
        type: "picker",
        defaultValue: "monthly",
        options: ["monthly", "weekly", "per_trip", "annual"],
      },
      {
        key: "status",
        label: "Status",
        type: "picker",
        defaultValue: "draft",
        options: ["draft", "active", "paused", "expired"],
      },
      {
        key: "effective_date",
        label: "Effective date",
        placeholder: "2026-09-15T00:00:00Z",
      },
      {
        key: "expiry_date",
        label: "Expiry date",
        placeholder: "Optional expiry date",
      },
      {
        key: "notes",
        label: "Notes",
        placeholder: "Pricing notes",
        type: "textarea",
        helperText: "Optional billing or agreement detail.",
      },
    ],
  },
  invoices: {
    title: "Invoices",
    endpoint: "invoices",
    accent: "#EF4444",
    icon: "receipt-long",
    fields: [
      {
        key: "invoice_number",
        label: "Invoice number",
        placeholder: "INV-1001",
        required: true,
      },
      {
        key: "client_id",
        label: "Client ID",
        placeholder: "Optional client UUID",
      },
      {
        key: "amount_cents",
        label: "Amount (cents)",
        keyboardType: "numeric",
        placeholder: "200000",
      },
      {
        key: "status",
        label: "Status",
        type: "picker",
        defaultValue: "draft",
        options: ["draft", "issued", "paid", "overdue", "cancelled"],
      },
      {
        key: "issued_at",
        label: "Issued at",
        placeholder: "2026-09-15T00:00:00Z",
      },
      { key: "due_date", label: "Due date", placeholder: "Optional due date" },
      { key: "paid_at", label: "Paid at", placeholder: "Optional paid date" },
      {
        key: "notes",
        label: "Notes",
        placeholder: "Invoice notes",
        type: "textarea",
        helperText: "Optional invoice memo or payment notes.",
      },
    ],
  },
  refunds: {
    title: "Refunds",
    endpoint: "refunds",
    accent: "#F97316",
    icon: "currency-exchange",
    fields: [
      {
        key: "client_id",
        label: "Client ID",
        placeholder: "Optional client UUID",
      },
      {
        key: "invoice_id",
        label: "Invoice ID",
        placeholder: "Optional invoice UUID",
      },
      {
        key: "amount_cents",
        label: "Amount (cents)",
        keyboardType: "numeric",
        placeholder: "50000",
      },
      {
        key: "reason",
        label: "Reason",
        placeholder: "Customer request",
        required: true,
      },
      {
        key: "status",
        label: "Status",
        type: "picker",
        defaultValue: "requested",
        options: ["requested", "approved", "processed", "rejected"],
      },
      {
        key: "processed_at",
        label: "Processed at",
        placeholder: "Optional processed date",
      },
      {
        key: "notes",
        label: "Notes",
        placeholder: "Refund notes",
        type: "textarea",
        helperText: "Optional processing or customer comms notes.",
      },
    ],
  },
  reconciliations: {
    title: "Reconciliations",
    endpoint: "reconciliations",
    accent: "#0EA5E9",
    icon: "account-balance",
    fields: [
      {
        key: "invoice_id",
        label: "Invoice ID",
        placeholder: "Optional invoice UUID",
      },
      {
        key: "batch_reference",
        label: "Batch reference",
        placeholder: "BATCH-001",
        required: true,
      },
      {
        key: "status",
        label: "Status",
        type: "picker",
        defaultValue: "pending",
        options: ["pending", "matched", "variance", "closed"],
      },
      {
        key: "amount_cents",
        label: "Amount (cents)",
        keyboardType: "numeric",
        placeholder: "200000",
      },
      {
        key: "variance_cents",
        label: "Variance (cents)",
        keyboardType: "numeric",
        placeholder: "0",
      },
      {
        key: "notes",
        label: "Notes",
        placeholder: "Reconciliation notes",
        type: "textarea",
        helperText: "Optional variance explanation or review summary.",
      },
    ],
  },
};

const getDefaultValues = (
  category: WorkflowCategory,
  item?: Record<string, any>,
) => {
  const config = WORKFLOW_CONFIG[category];

  return config.fields.reduce<Record<string, string>>((acc, field) => {
    const value = item?.[field.key];

    if (field.key === "amount_cents" || field.key === "variance_cents") {
      acc[field.key] = value == null ? "" : String(value);
      return acc;
    }

    const fallback = field.defaultValue ?? "";
    acc[field.key] = value == null ? fallback : String(value);
    return acc;
  }, {});
};

const toPayload = (
  category: WorkflowCategory,
  formState: Record<string, string>,
) => {
  const config = WORKFLOW_CONFIG[category];

  const payload: Record<string, any> = {};

  config.fields.forEach((field) => {
    const value = formState[field.key]?.trim() ?? "";

    if (field.key === "amount_cents" || field.key === "variance_cents") {
      payload[field.key] = Number.parseInt(value || "0", 10) || 0;
      return;
    }

    if (
      field.key.endsWith("_id") ||
      field.key.includes("_date") ||
      field.key.endsWith("_at")
    ) {
      payload[field.key] = value || null;
      return;
    }

    payload[field.key] = value || field.defaultValue || null;
  });

  return payload;
};

const isValidDate = (value?: string | null) => {
  if (!value) return true;

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const validateWorkflowForm = (
  category: WorkflowCategory,
  formState: Record<string, string>,
) => {
  const config = WORKFLOW_CONFIG[category];

  for (const field of config.fields) {
    const fieldValue = formState[field.key]?.trim() ?? "";

    if (field.required && !fieldValue) {
      return `${field.label} is required.`;
    }

    if (
      fieldValue &&
      (field.key === "amount_cents" || field.key === "variance_cents")
    ) {
      const parsed = Number.parseInt(fieldValue, 10);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return `${field.label} must be a valid whole number in cents.`;
      }
    }

    if (
      fieldValue &&
      (field.key.endsWith("_date") || field.key.endsWith("_at"))
    ) {
      if (!isValidDate(fieldValue)) {
        return `${field.label} must be a valid date timestamp.`;
      }
    }

    if (field.key === "file_url" && fieldValue) {
      try {
        new URL(fieldValue);
      } catch {
        return `${field.label} must be a valid URL.`;
      }
    }
  }

  if (category === "pricingAgreements" || category === "invoices") {
    const amount = Number.parseInt(formState.amount_cents || "0", 10);
    if (amount <= 0) {
      return "Amount must be greater than zero.";
    }
  }

  if (category === "refunds") {
    const amount = Number.parseInt(formState.amount_cents || "0", 10);
    if (amount <= 0) {
      return "Refund amount must be greater than zero.";
    }
  }

  if (category === "reconciliations") {
    const amount = Number.parseInt(formState.amount_cents || "0", 10);
    if (amount < 0) {
      return "Reconciliation amount cannot be negative.";
    }
  }

  return null;
};

const WorkflowForm = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    mode?: string;
    item?: string;
  }>();
  const { user } = useContext(AuthContext);

  const rawCategory =
    typeof params.category === "string" ? params.category : "dispatches";
  const mode = typeof params.mode === "string" ? params.mode : "create";

  const category = (
    Object.prototype.hasOwnProperty.call(WORKFLOW_CONFIG, rawCategory)
      ? rawCategory
      : "dispatches"
  ) as WorkflowCategory;

  const config = WORKFLOW_CONFIG[category];

  const existingItem = useMemo(() => {
    if (typeof params.item !== "string" || !params.item) {
      return null;
    }

    try {
      return JSON.parse(params.item);
    } catch (error) {
      console.warn("Failed to parse workflow item params", error);
      return null;
    }
  }, [params.item]);

  const [formState, setFormState] = useState<Record<string, string>>(() =>
    getDefaultValues(category, existingItem || undefined),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = mode === "edit" && Boolean(existingItem?.id);

  const { renderHeader } = useOwnerPageHeader({
    title: isEditMode ? `Edit ${config.title}` : `New ${config.title}`,
    subtitle: isEditMode
      ? "Update this workflow record"
      : `Create a new ${config.title.toLowerCase()} record`,
    onBackPress: () => router.back(),
  });

  const updateField = (key: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!user?.token) {
      setError("You must be signed in to save a workflow record.");
      return;
    }

    const validationError = validateWorkflowForm(category, formState);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const baseUrl = await resolveWorkingBaseUrl();
      const payload = toPayload(category, formState);

      const url = `${baseUrl}/owner/workflows/${config.endpoint}${
        isEditMode ? `/${existingItem.id}` : ""
      }`;

      const response = await fetch(url, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.error ||
            `Failed to ${isEditMode ? "update" : "create"} ${config.title.toLowerCase()}`,
        );
      }

      router.back();
    } catch (submitError) {
      console.warn(`Workflow form save failed:`, submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : `Unable to save ${config.title.toLowerCase()}`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: `${config.accent}22` },
              ]}
            >
              <MaterialIcons
                name={config.icon}
                size={18}
                color={config.accent}
              />
            </View>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryTitle}>{config.title}</Text>
              <Text style={styles.summaryMeta}>
                {isEditMode ? "Edit existing record" : "Create new record"}
              </Text>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.formCard}>
          {config.fields.map((field) => (
            <View key={field.key} style={styles.fieldRow}>
              <Text style={styles.label}>{field.label}</Text>

              {field.type === "picker" ? (
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={
                      formState[field.key] ?? field.defaultValue ?? ""
                    }
                    onValueChange={(value) =>
                      updateField(field.key, String(value))
                    }
                    style={styles.picker}
                  >
                    {field.options?.map((option) => (
                      <Picker.Item key={option} label={option} value={option} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <TextInput
                  style={[
                    styles.textInput,
                    field.type === "textarea" ? styles.textArea : null,
                  ]}
                  value={formState[field.key] ?? ""}
                  onChangeText={(text) => updateField(field.key, text)}
                  placeholder={field.placeholder}
                  keyboardType={field.keyboardType || "default"}
                  multiline={field.type === "textarea"}
                  numberOfLines={field.type === "textarea" ? 4 : 1}
                  textAlignVertical={
                    field.type === "textarea" ? "top" : "center"
                  }
                  autoCapitalize="none"
                />
              )}

              {field.helperText ? (
                <Text style={styles.helperText}>{field.helperText}</Text>
              ) : null}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isEditMode ? "Save changes" : "Create record"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WorkflowForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryMeta: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  errorText: {
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  fieldRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 44,
  },
  pickerWrap: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  picker: {
    color: "#0F172A",
    minHeight: 44,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  helperText: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
