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
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, radii, shadows } from "@/constants/theme";

export function ScreenBackdrop({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.backdropRoot, style]}>
      <LinearGradient
        colors={[colors.brandMist, "rgba(250,248,245,0.55)", colors.cream]}
        locations={[0, 0.28, 0.62]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

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

export function Panel({
  children,
  style,
  tone = "card",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: "card" | "paper" | "brand";
}) {
  return (
    <View
      style={[
        styles.panel,
        tone === "paper" && styles.panelPaper,
        tone === "brand" && styles.panelBrand,
        shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function AccentMark({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.accentMark, style]} />;
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
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.sectionTitleRow}>
          <AccentMark />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action && actionLabel ? (
        <Pressable onPress={action} hitSlop={8} style={styles.sectionActionHit}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Eyebrow({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !active && styles.chipPressed,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
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
      {({ pressed }) => (
        <LinearGradient
          colors={pressed ? [colors.brandLight, colors.brand] : [colors.brandLight, colors.brandDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryButtonFill}
        >
          {icon}
          <Text style={[styles.primaryButtonText, textStyle]}>{label}</Text>
        </LinearGradient>
      )}
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
  backdropRoot: {
    flex: 1,
    backgroundColor: colors.cream,
    overflow: "hidden",
  },
  surface: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.lg,
  },
  panel: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.xl,
    padding: 16,
    overflow: "hidden",
  },
  panelPaper: {
    backgroundColor: colors.paper,
  },
  panelBrand: {
    backgroundColor: colors.brandDeep,
    borderColor: "rgba(255,255,255,0.08)",
  },
  accentMark: {
    width: 18,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 24,
    fontFamily: fonts.serif,
    color: colors.charcoal,
    letterSpacing: -0.45,
    lineHeight: 28,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: fonts.sans,
    color: colors.charcoalMuted,
    lineHeight: 16,
    marginLeft: 28,
  },
  sectionActionHit: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.brandWash,
  },
  sectionAction: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: colors.brand,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: fonts.sansBold,
    color: colors.brandMuted,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipPressed: {
    backgroundColor: colors.creamDark,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.charcoalMuted,
  },
  chipTextActive: {
    color: colors.white,
  },
  primaryButton: {
    borderRadius: radii.md,
    overflow: "hidden",
    ...shadows.soft,
  },
  primaryButtonFill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.985 }],
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
    color: colors.white,
    letterSpacing: 0.25,
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
