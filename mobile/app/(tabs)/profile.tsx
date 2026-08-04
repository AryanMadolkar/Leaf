import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import ProfileView from "@/components/ProfileView";

export default function ProfileTab() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#faf7f2" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <ProfileView username={user.username} onLogout={logout} />;
}
