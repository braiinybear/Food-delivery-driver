import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { FontSize, Fonts } from "@/constants/typography";
import { useDeliveryProfile } from "@/hooks/useRiderInfo";
import { authClient } from "@/lib/auth-client";
import { showAlert } from "@/store/useAlertStore";

export default function RiderProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data: deliveryProfile, isLoading, refetch } = useDeliveryProfile();

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const user = deliveryProfile?.user;
  const isOnline = deliveryProfile?.status === "ONLINE";

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Profile Picture & Basic Info */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {deliveryProfile?.profilePic ? (
              <Image
                source={{ uri: deliveryProfile.profilePic }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={50} color={Colors.primary} />
              </View>
            )}
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? Colors.success : Colors.muted },
              ]}
            />
          </View>

          <Text style={styles.driverName}>{user?.name || "Driver"}</Text>
          <Text style={styles.email}>{user?.email || "N/A"}</Text>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isOnline
                  ? Colors.success + "18"
                  : Colors.muted + "18",
              },
            ]}
          >
            <View
              style={[
                styles.statusBadgeDot,
                {
                  backgroundColor: isOnline ? Colors.success : Colors.muted,
                },
              ]}
            />
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color: isOnline ? Colors.success : Colors.muted,
                },
              ]}
            >
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconBg}>
                <Ionicons name="star" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>
                {deliveryProfile?.rating?.toFixed(1) || "0"}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconBg}>
                <Ionicons name="checkmark-done" size={20} color={Colors.success} />
              </View>
              <Text style={styles.statValue}>
                {deliveryProfile?.totalDeliveries || 0}
              </Text>
              <Text style={styles.statLabel}>Deliveries</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconBg}>
                <Ionicons name="people" size={20} color={Colors.secondary} />
              </View>
              <Text style={styles.statValue}>
                {deliveryProfile?.ratingCount || 0}
              </Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <InfoCard
            icon="person-outline"
            label="Name"
            value={user?.name || "—"}
            color={Colors.primary}
          />

          <InfoCard
            icon="mail-outline"
            label="Email"
            value={user?.email || "—"}
            color={Colors.primary}
          />

          <InfoCard
            icon="call-outline"
            label="Phone"
            value={user?.phoneNumber || "Not provided"}
            color={Colors.primary}
          />
        </View>

        {/* Vehicle Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>

          <InfoCard
            icon="car-outline"
            label="Vehicle Type"
            value={deliveryProfile?.vehicleType || "—"}
            color={Colors.secondary}
          />

          <InfoCard
            icon="document-text-outline"
            label="License Number"
            value={deliveryProfile?.licenseNumber || "—"}
            color={Colors.secondary}
          />

          <InfoCard
            icon="ticket-outline"
            label="Vehicle Plate"
            value={deliveryProfile?.vehiclePlate || "—"}
            color={Colors.secondary}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => {
              showAlert("Edit Profile", "Edit profile feature coming soon");
            }}
          >
            <View style={styles.actionIconBg}>
              <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Edit Profile</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.muted}
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => {
              showAlert(
                "Vehicle Details",
                "Vehicle details management coming soon"
              );
            }}
          >
            <View style={styles.actionIconBg}>
              <Ionicons
                name="settings-outline"
                size={20}
                color={Colors.secondary}
              />
            </View>
            <Text style={styles.actionText}>Vehicle Details</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.muted}
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => {
              showAlert("Documents", "Upload and manage your documents");
            }}
          >
            <View style={styles.actionIconBg}>
              <Ionicons name="shield-outline" size={20} color={Colors.success} />
            </View>
            <Text style={styles.actionText}>Verification Documents</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.muted}
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
        </View>

        {/* Settings & Help */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => {
              showAlert("Support", "Contact support coming soon");
            }}
          >
            <View style={styles.actionIconBg}>
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.actionText}>Help & Support</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.muted}
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => {
              showAlert("Logout", "Are you sure you want to logout?", [
                {
                  text: "Cancel",
                  onPress: () => {},
                  style: "cancel",
                },
                {
                  text: "Logout",
                  onPress: () => {
                    authClient.signOut();
                    router.replace("/login");
                  },
                  style: "destructive",
                },
              ]);
            }}
          >
            <View
              style={[styles.actionIconBg, { backgroundColor: Colors.danger + "18" }]}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            </View>
            <Text style={[styles.actionText, { color: Colors.danger }]}>
              Logout
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.muted}
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

// ─── Info Card Component ────────────────────────────────────────────────────
function InfoCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={[styles.infoIconBg, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  profileHeader: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 24,
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 20,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: Colors.surface,
  },
  profileImagePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: Colors.border,
  },
  statusDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: Colors.background,
  },
  driverName: {
    fontFamily: Fonts.brandBlack,
    fontSize: 22,
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontFamily: Fonts.brandMedium,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
  },
  statusBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontFamily: Fonts.brandBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontFamily: Fonts.brandBlack,
    fontSize: 20,
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: Fonts.brandBold,
    fontSize: 10,
    color: Colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.brandBlack,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  infoIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: Fonts.brandBold,
    fontSize: 11,
    color: Colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: Fonts.brandBold,
    fontSize: 15,
    color: Colors.text,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    fontFamily: Fonts.brandBold,
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
});
