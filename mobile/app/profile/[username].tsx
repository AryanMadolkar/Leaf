import React from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import ProfileView from "@/components/ProfileView";

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return (
    <>
      <Stack.Screen options={{ title: `@${username}` }} />
      <ProfileView username={username} />
    </>
  );
}
