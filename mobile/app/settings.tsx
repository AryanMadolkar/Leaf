import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { resolveMediaUrl } from "@/lib/media";
import { colors, fonts } from "@/constants/theme";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const canSave = username.trim().length > 0 && !saving;
  const shownAvatar = previewUri || resolveMediaUrl(avatarUrl);

  const pickAvatar = async (source: "camera" | "library") => {
    setError(null);

    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Camera permission needed", "Allow camera access to take a profile photo.");
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photo permission needed", "Allow photo access to choose a profile picture.");
        return;
      }
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.55,
            base64: true,
            exif: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.55,
            base64: true,
            exif: false,
          });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      setError("Could not read that photo. Try another one.");
      return;
    }

    const mime = asset.mimeType || "image/jpeg";
    const dataUri = `data:${mime};base64,${asset.base64}`;
    // Keep avatars small — data URIs live in the profiles table
    if (dataUri.length > 900_000) {
      setError("Photo is too large. Try a smaller image or take a closer crop.");
      return;
    }

    setPreviewUri(asset.uri);
    setAvatarUrl(dataUri);
  };

  const choosePhoto = () => {
    if (Platform.OS === "web") {
      pickAvatar("library");
      return;
    }
    Alert.alert("Profile photo", "Choose a source", [
      { text: "Camera", onPress: () => pickAvatar("camera") },
      { text: "Photo library", onPress: () => pickAvatar("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removePhoto = () => {
    setPreviewUri(null);
    setAvatarUrl("");
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await authFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          username: username.trim(),
          bio,
          avatar_url: avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not save changes");
      await refreshUser();
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edit Profile</Text>

        {error && <Text style={styles.error}>{error}</Text>}
        {saved && <Text style={styles.saved}>Saved.</Text>}

        <Text style={styles.label}>Photo</Text>
        <View style={styles.avatarRow}>
          <Pressable onPress={choosePhoto} style={styles.avatarButton}>
            {shownAvatar ? (
              <Image source={{ uri: shownAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initials(displayName || username || "R")}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color={colors.white} />
            </View>
          </Pressable>
          <View style={styles.avatarActions}>
            <Pressable style={styles.changePhotoButton} onPress={choosePhoto}>
              <Text style={styles.changePhotoText}>Upload photo</Text>
            </Pressable>
            {!!avatarUrl && (
              <Pressable onPress={removePhoto}>
                <Text style={styles.removePhotoText}>Remove</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.charcoalMuted}
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          placeholderTextColor={colors.charcoalMuted}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell readers about yourself..."
          placeholderTextColor={colors.charcoalMuted}
          multiline
          numberOfLines={3}
        />

        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Save Changes</Text>}
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 10, paddingBottom: 48 },
  title: { fontSize: 24, fontFamily: fonts.serif, color: colors.charcoal, marginBottom: 8 },
  error: { color: colors.error, fontSize: 12, fontFamily: fonts.sans },
  saved: { color: colors.brand, fontSize: 12, fontFamily: fonts.sans },
  label: {
    fontSize: 10,
    fontFamily: fonts.sansBold,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    marginTop: 8,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 4 },
  avatarButton: { position: "relative" },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.creamDark },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 24, fontFamily: fonts.sansBold, color: colors.brand },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.cream,
  },
  avatarActions: { gap: 8 },
  changePhotoButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
  },
  changePhotoText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.charcoal },
  removePhotoText: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.charcoalMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.sans,
    backgroundColor: colors.creamCard,
    color: colors.charcoal,
  },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  saveButton: {
    marginTop: 16,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { fontSize: 14, fontFamily: fonts.sansBold, color: colors.white },
  cancelButton: { marginTop: 8, alignItems: "center", paddingVertical: 10 },
  cancelText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.charcoalMuted },
});
