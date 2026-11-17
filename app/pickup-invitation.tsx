import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/authContext/auth-context";
import { loginUser } from "../functions/auth";
import { saveAuthToken } from "../store/asyncStorage/authStore";
import { setSupabaseSession } from "../supabaseConfig/supabaseConfig";
import { resolveWorkingBaseUrl } from "../url";

type Invitation = {
  invitee_name: string;
  email: string;
  child_name: string | null;
  relationship: string;
  expires_at: string;
};

export default function PickupInvitationPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const { user, refreshUser } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"create" | "existing">("create");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [existingEmail, setExistingEmail] = useState("");
  const [existingPassword, setExistingPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const signedInEmail = useMemo(
    () => String(user?.userData?.email || "").trim().toLowerCase(),
    [user?.userData?.email],
  );

  useEffect(() => {
    let active = true;
    const loadInvitation = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const baseUrl = await resolveWorkingBaseUrl();
        const response = await fetch(
          `${baseUrl}/pickup-invitations/${encodeURIComponent(token)}`,
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "This invitation is not available.");
        if (active) {
          setInvitation(data);
          setExistingEmail(data.email || "");
        }
      } catch (error) {
        if (active) {
          Alert.alert(
            "Invitation unavailable",
            error instanceof Error ? error.message : "Please request a new invite.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadInvitation();
    return () => {
      active = false;
    };
  }, [token]);

  const acceptWithExistingAccount = async (accountToken: string) => {
    if (!token) throw new Error("INVITATION_NOT_FOUND");
    const baseUrl = await resolveWorkingBaseUrl();
    const response = await fetch(
      `${baseUrl}/pickup-invitations/${encodeURIComponent(token)}/accept`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accountToken}` },
      },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Unable to accept this invitation.");
  };

  const finishAcceptance = async () => {
    await refreshUser();
    router.replace("/pickup-contact" as never);
  };

  const acceptWithSignedInAccount = async () => {
    if (!user?.token) return;
    setSubmitting(true);
    try {
      await acceptWithExistingAccount(user.token);
      await finishAcceptance();
    } catch (error) {
      Alert.alert(
        "Invitation not accepted",
        error instanceof Error ? error.message : "Please sign in with the invited email.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const createAccount = async () => {
    if (!token || password.length < 8 || password !== confirmPassword) {
      Alert.alert(
        "Check your details",
        password.length < 8
          ? "Use a password with at least 8 characters."
          : "The passwords do not match.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const baseUrl = await resolveWorkingBaseUrl();
      const response = await fetch(`${baseUrl}/pickup-invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (
        response.status === 409 &&
        data.error === "ACCOUNT_ALREADY_EXISTS_SIGN_IN_TO_ACCEPT"
      ) {
        setMode("existing");
        Alert.alert(
          "Account already exists",
          "Sign in with the invited email to accept this pickup authorization.",
        );
        return;
      }
      if (!response.ok)
        throw new Error(data.error || "Unable to create the pickup account.");
      if (!data.token || !data.user || !data.supabaseSession)
        throw new Error("The account response was incomplete. Please sign in.");
      await setSupabaseSession(data.supabaseSession);
      await saveAuthToken(data.token, data.user);
      await finishAcceptance();
    } catch (error) {
      Alert.alert(
        "Account not created",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const signInAndAccept = async () => {
    if (!existingEmail.trim() || !existingPassword) {
      Alert.alert("Sign in required", "Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const authResult = await loginUser({
        email: existingEmail,
        password: existingPassword,
      });
      if (!authResult?.token)
        throw new Error("Unable to sign in to the existing account.");
      await acceptWithExistingAccount(authResult.token);
      await refreshUser();
      router.replace("/pickup-contact" as never);
    } catch (error: any) {
      Alert.alert(
        "Invitation not accepted",
        error?.response?.data?.error ||
          error?.message ||
          "Sign in with the email address that received this invitation.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.icon}>
          <MaterialIcons name="verified-user" size={34} color="#C14BFF" />
        </View>
        <Text style={styles.title}>Trusted pickup invitation</Text>
        {loading ? (
          <ActivityIndicator color="#C14BFF" style={styles.loader} />
        ) : !invitation ? (
          <Text style={styles.body}>
            This invitation may have expired or already been used. Ask the
            parent to send a new one.
          </Text>
        ) : (
          <>
            <Text style={styles.body}>
              {invitation.invitee_name}, you have been authorized by a parent
              or guardian to collect{" "}
              <Text style={styles.emphasis}>{invitation.child_name || "a child"}</Text>.
              Your account will only show children whose parents authorize you.
            </Text>
            <Text style={styles.email}>{invitation.email}</Text>

            {user?.token && signedInEmail === invitation.email.toLowerCase() ? (
              <TouchableOpacity
                style={styles.primaryButton}
                disabled={submitting}
                onPress={() => void acceptWithSignedInAccount()}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryText}>Accept with my account</Text>
                )}
              </TouchableOpacity>
            ) : null}

            {mode === "create" ? (
              <>
                <Text style={styles.label}>Create a password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#8B8195"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor="#8B8195"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((current) => !current)}
                  style={styles.toggle}
                >
                  <Text style={styles.link}>
                    {showPassword ? "Hide password" : "Show password"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  disabled={submitting}
                  onPress={() => void createAccount()}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryText}>Create account & accept</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMode("existing")}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.link}>I already have an account</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Invited email address</Text>
                <TextInput
                  value={existingEmail}
                  onChangeText={setExistingEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={existingPassword}
                  onChangeText={setExistingPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TouchableOpacity
                  style={styles.primaryButton}
                  disabled={submitting}
                  onPress={() => void signInAndAccept()}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryText}>Sign in & accept</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMode("create")}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.link}>Create a new account instead</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#100B16" },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  icon: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#251631",
    marginBottom: 18,
  },
  title: {
    color: "#FBF8FF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    color: "#C9BDCF",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 16,
  },
  emphasis: { color: "#FFF", fontWeight: "800" },
  email: {
    color: "#D7C5E6",
    textAlign: "center",
    marginTop: 9,
    marginBottom: 22,
  },
  loader: { marginTop: 28 },
  label: { color: "#D7C5E6", fontSize: 12, fontWeight: "700", marginTop: 14 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#44354E",
    backgroundColor: "#1A1222",
    borderRadius: 10,
    padding: 13,
    color: "#FBF8FF",
  },
  toggle: { alignSelf: "flex-end", paddingVertical: 10 },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#9B2BE7",
    marginTop: 20,
  },
  primaryText: { color: "#FFF", fontWeight: "800" },
  secondaryButton: { alignItems: "center", paddingVertical: 16 },
  link: { color: "#D9A9FF", fontWeight: "700" },
});
