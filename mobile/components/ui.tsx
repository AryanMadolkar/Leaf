import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radii, shadows } from "@/constants/theme";

export function Surface({
  children,
  style,
  elevated = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}) {
  return (
    <View style={[styles.surface, elevated ? shadows.card : shadows.soft, style]}>{children}</View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  actionLabel,
  style,
}: {
  title: string;
  subtitle?: string;
  action?: () => void;
  actionLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action && actionLabel ? (
        <Pressable onPress={action} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Eyebrow({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function PrimaryButton({
  label,
  icon,
  style,
  textStyle,
  ...rest
}: PressableProps & {
  label: string;
  icon?: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && styles.primaryButtonPressed,
        rest.disabled && styles.primaryButtonDisabled,
        style,
      ]}
      {...rest}
    >
      {icon}
      <Text style={[styles.primaryButtonText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  icon,
  style,
  textStyle,
  ...rest
}: PressableProps & {
  label: string;
  icon?: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed && styles.secondaryButtonPressed,
        rest.disabled && styles.primaryButtonDisabled,
        style,
      ]}
      {...rest}
    >
      {icon}
      <Text style={[styles.secondaryButtonText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: fonts.serif,
    color: colors.charcoal,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: fonts.sans,
    color: colors.charcoalMuted,
    lineHeight: 16,
  },
  sectionAction: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.brand,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: fonts.sansBold,
    color: colors.charcoalMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingVertical: 13,
    paddingHorizontal: 18,
    ...shadows.soft,
  },
  primaryButtonPressed: {
    backgroundColor: colors.brandLight,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
    color: colors.white,
    letterSpacing: 0.2,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.creamCard,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.creamBorder,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.creamDark,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.charcoal,
  },
});
