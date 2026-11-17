import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ClientHeader from "../components/ClientHeader";
import { AuthContext } from "../../../context/authContext/auth-context";
import { resolveWorkingBaseUrl } from "../../../url";

const categories = ["account", "child", "school", "trip", "tracking", "payment", "technical", "other"] as const;
type Category = (typeof categories)[number];

const SupportTicketPage = () => {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Category>("technical");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Details required", "Add a subject and describe how we can help.");
      return;
    }
    if (!user?.token) {
      Alert.alert("Session expired", "Please sign in again to submit a ticket.");
      return;
    }

    setSubmitting(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/client/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), category }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || data?.error || "Unable to submit your ticket.");
      Alert.alert("Ticket submitted", "Your support request has been sent.");
      router.back();
    } catch (error) {
      Alert.alert("Ticket not submitted", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ClientHeader title="Create a ticket" subtitle="Send a request to the support team" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Category</Text>
        <View style={styles.categories}>
          {categories.map((item) => (
            <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[styles.category, category === item && styles.selectedCategory]}>
              <Text style={[styles.categoryText, category === item && styles.selectedCategoryText]}>{item.replaceAll("_", " ")}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Subject</Text>
        <TextInput value={subject} onChangeText={setSubject} maxLength={200} placeholder="Briefly describe the issue" style={styles.input} />
        <Text style={styles.label}>How can we help?</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          maxLength={10000}
          multiline
          textAlignVertical="top"
          placeholder="Include relevant details. Please do not include your password or safety PIN."
          style={[styles.input, styles.messageInput]}
        />
        <TouchableOpacity onPress={() => void submit()} disabled={submitting} style={[styles.submitButton, submitting && styles.disabled]}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.submitText}>Submit ticket</Text><MaterialIcons name="arrow-forward" size={19} color="#FFFFFF" /></>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#07040B" },
  content: { padding: 18, paddingBottom: 36 },
  label: { color: "#FBF8FF", fontSize: 14, fontWeight: "700", marginBottom: 8, marginTop: 15 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: { backgroundColor: "#130D1A", borderColor: "#352341", borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  selectedCategory: { backgroundColor: "#16853B", borderColor: "#16853B" },
  categoryText: { color: "#52665A", fontSize: 12, textTransform: "capitalize" },
  selectedCategoryText: { color: "#FFFFFF", fontWeight: "700" },
  input: { backgroundColor: "#130D1A", borderColor: "#352341", borderRadius: 12, borderWidth: 1, color: "#FBF8FF", fontSize: 14, minHeight: 48, paddingHorizontal: 13, paddingVertical: 12 },
  messageInput: { minHeight: 150 },
  submitButton: { alignItems: "center", backgroundColor: "#16853B", borderRadius: 12, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 24, minHeight: 50 },
  submitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.65 },
});

export default SupportTicketPage;
