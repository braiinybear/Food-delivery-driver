import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import {
  AlertButton,
  AlertButtonStyle,
  AlertType,
  useAlertStore,
} from "@/store/useAlertStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);

// ─── Icon config per alert type ────────────────────────────────────────
const ICON_CONFIG: Record<
  AlertType,
  {
    name: keyof typeof Ionicons.glyphMap;
    bg: string;
    color: string;
  }
> = {
  success: {
    name: "checkmark-circle",
    bg: "#E8F5E9",
    color: Colors.success,
  },
  error: {
    name: "close-circle",
    bg: "#FFEBEE",
    color: Colors.danger,
  },
  warning: {
    name: "warning",
    bg: "#FFF3E0",
    color: Colors.warning,
  },
  info: {
    name: "information-circle",
    bg: "#E0F2F1",
    color: Colors.primary,
  },
  confirm: {
    name: "help-circle",
    bg: "#FFF8E1",
    color: Colors.secondary,
  },
};

// ─── Button style helpers ──────────────────────────────────────────────
function getButtonStyles(
  style: AlertButtonStyle | undefined,
  isOnly: boolean,
  index: number,
  total: number
) {
  const base: any = {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  if (style === "destructive") {
    return {
      ...base,
      backgroundColor: Colors.danger,
    };
  }
  if (style === "cancel") {
    return {
      ...base,
      backgroundColor: "#F3F4F6",
      borderWidth: 1,
      borderColor: Colors.border,
    };
  }
  // default / primary
  if (isOnly || index === total - 1) {
    return {
      ...base,
      backgroundColor: Colors.primary,
    };
  }
  return {
    ...base,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: Colors.border,
  };
}

function getButtonTextColor(
  style: AlertButtonStyle | undefined,
  isOnly: boolean,
  index: number,
  total: number
): string {
  if (style === "destructive") return "#FFF";
  if (style === "cancel") return Colors.text;
  if (isOnly || index === total - 1) return "#FFF";
  return Colors.text;
}

export default function GlobalCustomAlert() {
  const { visible, title, message, buttons, type, hide } = useAlertStore();

  // ─── Animations ────────────────────────────────────────────────────
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.85)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 1,
          damping: 18,
          stiffness: 200,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      modalScale.setValue(0.85);
      modalOpacity.setValue(0);
    }
  }, [visible]);

  const handlePress = (btn: AlertButton) => {
    hide();
    // Small delay so hide animation fires before callback
    setTimeout(() => btn.onPress?.(), 80);
  };

  const icon = ICON_CONFIG[type] ?? ICON_CONFIG.info;

  // Sort buttons: cancel first, destructive/default last
  const sortedButtons = [...buttons].sort((a, b) => {
    if (a.style === "cancel") return -1;
    if (b.style === "cancel") return 1;
    return 0;
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        // If there's a cancel button, press it; otherwise just hide
        const cancelBtn = buttons.find((b) => b.style === "cancel");
        if (cancelBtn) {
          handlePress(cancelBtn);
        } else {
          hide();
        }
      }}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ scale: modalScale }],
              opacity: modalOpacity,
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
            <Ionicons name={icon.name} size={36} color={icon.color} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Buttons */}
          <View
            style={[
              styles.buttonRow,
              sortedButtons.length === 1 && { justifyContent: "center" },
            ]}
          >
            {sortedButtons.map((btn, i) => {
              const isOnly = sortedButtons.length === 1;
              const btnStyle = getButtonStyles(
                btn.style,
                isOnly,
                i,
                sortedButtons.length
              );
              const textColor = getButtonTextColor(
                btn.style,
                isOnly,
                i,
                sortedButtons.length
              );

              return (
                <TouchableOpacity
                  key={`${btn.text}-${i}`}
                  style={btnStyle}
                  activeOpacity={0.8}
                  onPress={() => handlePress(btn)}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modal: {
    width: MODAL_WIDTH,
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  buttonText: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    letterSpacing: 0.3,
  },
});
