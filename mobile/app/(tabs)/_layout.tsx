import { Ionicons } from "@expo/vector-icons";
import { Link, Redirect, Tabs } from "expo-router";
import { ActivityIndicator, Image, Platform, Pressable, Text, View } from "react-native";

import { colors, fonts, radii, shadows } from "@/constants/theme";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useAuth } from "@/lib/auth";

function LeafHeaderTitle() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          backgroundColor: colors.brand,
          alignItems: "center",
          justifyContent: "center",
          ...shadows.soft,
        }}
      >
        <Image
          source={require("@/assets/images/leaf-logo.png")}
          style={{ width: 16, height: 16, tintColor: colors.cream }}
          resizeMode="contain"
        />
      </View>
      <Text
        style={{
          fontSize: 22,
          fontFamily: fonts.serif,
          color: colors.charcoal,
          letterSpacing: -0.5,
        }}
      >
        Leaf
      </Text>
    </View>
  );
}

function HeaderIcon({ href, name }: { href: "/search" | "/settings"; name: keyof typeof Ionicons.glyphMap }) {
  return (
    <Link href={href} asChild>
      <Pressable
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: radii.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? colors.creamDark : "transparent",
        })}
        hitSlop={8}
      >
        <Ionicons name={name} size={20} color={colors.charcoal} />
      </Pressable>
    </Link>
  );
}

export default function TabLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  // Must run before any early return — conditional hooks break React's rules.
  const headerShown = useClientOnlyValue(false, true);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.charcoalMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.sansSemiBold,
          fontSize: 10,
          letterSpacing: 0.25,
        },
        tabBarStyle: {
          backgroundColor: colors.creamCard,
          borderTopColor: colors.creamBorder,
          borderTopWidth: StyleSheetHairline(),
          height: Platform.OS === "ios" ? 88 : 66,
          paddingTop: 8,
          ...shadows.card,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        headerShown,
        headerStyle: {
          backgroundColor: colors.cream,
          borderBottomWidth: StyleSheetHairline(),
          borderBottomColor: colors.creamBorder,
        },
        headerShadowVisible: false,
        headerTitle: () => <LeafHeaderTitle />,
        headerRight: () => (
          <View style={{ paddingRight: 12 }}>
            <HeaderIcon href="/search" name="search" />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "sparkles" : "sparkles-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "library" : "library-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: "Diary",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} color={color} size={size} />
          ),
          headerRight: () => (
            <View style={{ paddingRight: 12 }}>
              <HeaderIcon href="/settings" name="settings-outline" />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

function StyleSheetHairline() {
  return Platform.OS === "web" ? 1 : 0.5;
}
