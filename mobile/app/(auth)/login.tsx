import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useAuth } from "@/lib/auth";
import { AccentMark } from "@/components/ui";
import { colors, fonts, radii, shadows } from "@/constants/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={[colors.brandMist, colors.cream, colors.paper]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <View style={styles.logoMark}>
            <Image
              source={require("@/assets/images/leaf-logo.png")}
              style={{ width: 22, height: 22, tintColor: colors.cream }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Leaf</Text>
          <AccentMark style={{ alignSelf: "center" }} />
          <Text style={styles.subtitle}>A home for people who love books.</Text>
        </View>

        <View style={styles.formCard}>
          {error && <Text style={styles.error}>{error}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.charcoalMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.charcoalMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !email || !password}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <Link href="/(auth)/signup" style={styles.link}>
          <Text style={styles.linkText}>Don&apos;t have an account? Create one</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 20 },
  brandBlock: { alignItems: "center", gap: 10, marginBottom: 8 },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    ...shadows.float,
  },
  title: { fontFamily: fonts.serif, fontSize: 48, textAlign: "center", color: colors.charcoal, letterSpacing: -1 },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.sans,
    textAlign: "center",
    color: colors.charcoalMuted,
    lineHeight: 22,
    maxWidth: 260,
  },
  formCard: {
    backgroundColor: colors.creamCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    padding: 18,
    gap: 12,
    ...shadows.card,
  },
  error: { color: colors.error, fontSize: 13, fontFamily: fonts.sans, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.sans,
    backgroundColor: colors.cream,
    color: colors.charcoal,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { fontFamily: fonts.sansBold, color: colors.white, fontSize: 14, letterSpacing: 0.2 },
  link: { alignSelf: "center", marginTop: 4 },
  linkText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.brand },
});
