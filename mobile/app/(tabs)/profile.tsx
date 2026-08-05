import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import ProfileView from "@/components/ProfileView";
import { colors } from "@/constants/theme";

export default function ProfileTab() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <ProfileView username={user.username} onLogout={logout} />;
}
