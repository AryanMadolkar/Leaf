import React from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import ProfileView from "@/components/ProfileView";
import { paramString } from "@/lib/navigation";
import { colors, fonts } from "@/constants/theme";

export default function UserProfileScreen() {
  const params = useLocalSearchParams<{ username: string | string[] }>();
  const handle = paramString(params.username);

  if (!handle) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream }}>
        <Text style={{ fontFamily: fonts.sans, color: colors.charcoalMuted }}>Profile not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `@${handle}` }} />
      <ProfileView username={handle} />
    </>
  );
}
