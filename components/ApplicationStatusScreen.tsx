import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { useDeliveryPartnerStatus } from "@/hooks/useDeliveryPartnerRequest";
import { usePartnerStore } from "@/store/userider";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { authClient } from "@/lib/auth-client";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showAlert } from "@/store/useAlertStore";

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

interface StatusScreenContent {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackgroundColor: string;
  message: string;
  primaryButtonText?: string;
  primaryButtonAction?: () => void;
  secondaryButtonText?: string;
  secondaryButtonAction?: () => void;
  containerBackgroundColor: string;
}

export default function ApplicationStatusScreen() {
  const { setAppliedForRider } = usePartnerStore();
  const { refetch: refetchSession } = authClient.useSession();
  const insets = useSafeAreaInsets();
  const {
    data: application,
    isLoading,
    isError,
    refetch,
  } = useDeliveryPartnerStatus();
  const getStatusContent = (status: ApplicationStatus): StatusScreenContent => {
    switch (status) {
      case "APPROVED":
        return {
          title: "🎉 Approved!",
          subtitle: "You're ready to deliver",
          icon: "checkmark-circle",
          iconColor: Colors.success,
          iconBackgroundColor: "rgba(46, 204, 113, 0.1)",
          message: `Congratulations! Your delivery partner application has been approved. You can now start accepting delivery orders with your ${application?.vehicleType || "vehicle"}.`,
          primaryButtonText: "Go to Dashboard",
          primaryButtonAction: async () => {
            await refetchSession();
            setAppliedForRider(false);
            router.replace("/");
          },
          containerBackgroundColor: "rgba(46, 204, 113, 0.05)",
        };

      case "PENDING":
        return {
          title: "⏳ Application Pending",
          subtitle: "We're reviewing your application",
          icon: "hourglass",
          iconColor: Colors.primary,
          iconBackgroundColor: "rgba(0, 77, 77, 0.15)",
          message: `Your delivery partner application is being reviewed by our team. This typically takes 24-48 hours. We'll notify you once a decision is made. Vehicle: ${application?.vehicleType || "Unknown"}`,
          secondaryButtonText: "Go Back",
          containerBackgroundColor: "rgba(0, 77, 77, 0.05)",
        };

      case "REJECTED":
        return {
          title: "❌ Application Rejected",
          subtitle: "Application could not be approved",
          icon: "close-circle",
          iconColor: "#E74C3C",
          iconBackgroundColor: "rgba(231, 76, 60, 0.1)",
          message: `Unfortunately, your delivery partner application was not approved at this time. You can contact our support team for more details or apply again later with updated information.`,
          primaryButtonText: "Contact Support",
          primaryButtonAction: () => {
            showAlert(
              "Contact Support",
              "Please reach out to our support team via:\n\nEmail: support@fooddelivery.com\nPhone: +1-800-123-4567",
            );
          },
          secondaryButtonText: "Go Back",
          secondaryButtonAction: () => router.back(),
          containerBackgroundColor: "rgba(231, 76, 60, 0.05)",
        };

      default:
        return {
          title: "Application Status",
          subtitle: "Unknown status",
          icon: "help-circle",
          iconColor: Colors.muted,
          iconBackgroundColor: Colors.light,
          message: "Unable to determine your application status.",
          secondaryButtonText: "Go Back",
          secondaryButtonAction: () => router.back(),
          containerBackgroundColor: Colors.surface,
        };
    }
  };

  // ─── Loading State ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primary }}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={[styles.headerStatic, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.headerTitle}>Application Status</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            Checking your application status...
          </Text>
        </View>
      </View>
    );
  }

  // ─── Error State (No Application Found) ────────────────────────────────────
  if (isError || !application) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primary }}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        {/* Header — outside ScrollView so it covers status bar */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.headerTitle}>Application Status</Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={styles.refreshBtn}
            disabled={isLoading}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ backgroundColor: Colors.background }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Empty State */}
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIcon}>
              <Ionicons
                name="document-text-outline"
                size={56}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.emptyStateTitle}>No Application Found</Text>
            <Text style={styles.emptyStateMessage}>
              You haven&apos;t submitted a delivery partner application yet.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push("/driverform")}
            >
              <Ionicons
                name="arrow-forward-outline"
                size={20}
                color={Colors.white}
              />
              <Text style={styles.primaryBtnText}>Apply Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.secondaryBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Status Content ───────────────────────────────────────────────────────
  const content = getStatusContent(application.status as ApplicationStatus);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.primary }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header — outside ScrollView so it covers status bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Application Status</Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={styles.refreshBtn}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ backgroundColor: Colors.background }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View
          style={[
            styles.statusCard,
            { backgroundColor: content.containerBackgroundColor },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.statusIcon,
              { backgroundColor: content.iconBackgroundColor },
            ]}
          >
            <Ionicons name={content.icon} size={56} color={content.iconColor} />
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.statusTitle}>{content.title}</Text>
          <Text style={styles.statusSubtitle}>{content.subtitle}</Text>

          {/* Message */}
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{content.message}</Text>
          </View>

          {/* Application Details - Specs Grid */}
          {application && (
            <>
              <View style={styles.specsGrid}>
                <View style={styles.specCard}>
                  <View style={styles.specIconContainer}>
                    <Ionicons
                      name="car-outline"
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.specLabel}>Vehicle</Text>
                  <Text style={styles.specValue}>
                    {application.vehicleType || "N/A"}
                  </Text>
                </View>

                <View style={styles.specCard}>
                  <View style={styles.specIconContainer}>
                    <Ionicons
                      name="card-outline"
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.specLabel}>License</Text>
                  <Text style={styles.specValue}>
                    {application.licenseNumber
                      ? application.licenseNumber.slice(-4)
                      : "N/A"}
                  </Text>
                </View>

                <View style={styles.specCard}>
                  <View style={styles.specIconContainer}>
                    <Ionicons
                      name="list-outline"
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.specLabel}>Plate</Text>
                  <Text style={styles.specValue}>
                    {application.vehiclePlate || "N/A"}
                  </Text>
                </View>

                <View style={styles.specCard}>
                  <View style={styles.specIconContainer}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.specLabel}>Applied</Text>
                  <Text style={styles.specValue}>
                    {application.createdAt
                      ? new Date(application.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        },
                      )
                      : "N/A"}
                  </Text>
                </View>
              </View>

              {/* Documents Checklist */}
              {(application.licenseFrontUrl ||
                application.licenseBackUrl ||
                application.vehicleRcUrl) && (
                  <View style={styles.documentsSection}>
                    <Text style={styles.sectionTitle}>📋 Documents</Text>
                    <View style={styles.documentsList}>
                      {application.licenseFrontUrl && (
                        <View style={styles.documentItem}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={Colors.success}
                          />
                          <Text style={styles.documentText}>License Front</Text>
                        </View>
                      )}
                      {application.licenseBackUrl && (
                        <View style={styles.documentItem}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={Colors.success}
                          />
                          <Text style={styles.documentText}>License Back</Text>
                        </View>
                      )}
                      {application.vehicleRcUrl && (
                        <View style={styles.documentItem}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={Colors.success}
                          />
                          <Text style={styles.documentText}>Vehicle RC</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
            </>
          )}

          {/* Info Box */}
          {application.status === "PENDING" && (
            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.infoText}>
                Our team reviews applications within 24-48 hours. Check back
                soon!
              </Text>
            </View>
          )}

          {application.status === "REJECTED" && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={20} color="#E74C3C" />
              <Text style={styles.warningText}>
                You can apply again after addressing the issues. Contact support
                for details.
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {content.primaryButtonText && content.primaryButtonAction && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={content.primaryButtonAction}
            >
              <Ionicons
                name={
                  application.status === "APPROVED"
                    ? "home-outline"
                    : "call-outline"
                }
                size={20}
                color={Colors.white}
              />
              <Text style={styles.primaryBtnText}>
                {content.primaryButtonText}
              </Text>
            </TouchableOpacity>
          )}

          {content.secondaryButtonText && content.secondaryButtonAction && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={content.secondaryButtonAction}
            >
              <Text style={styles.secondaryBtnText}>
                {content.secondaryButtonText}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: Colors.primary,
  },
  headerStatic: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: Colors.primary,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: "#FFFFFF",
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  statusCard: {
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  statusTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginBottom: 4,
    textAlign: "center",
  },
  statusSubtitle: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 14,
    textAlign: "center",
  },
  messageBox: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  messageText: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.xs,
    color: Colors.text,
    lineHeight: 18,
  },
  detailsBox: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  detailItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "flex-start",
    gap: 12,
  },
  detailContent: {
    color: "black",
    flex: 1,
  },
  detailLabel: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginBottom: 4,
  },
  detailValue: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  specCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  specIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 77, 77, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  specLabel: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginBottom: 4,
    textAlign: "center",
  },
  specValue: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.xs,
    color: Colors.text,
    textAlign: "center",
  },
  documentsSection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    width: "100%",
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.xs,
    color: Colors.text,
    marginBottom: 8,
  },
  documentsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  documentItem: {
    minWidth: "48%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0, 77, 77, 0.05)",
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: "flex-start",
  },
  documentText: {
    flex: 1,
    fontFamily: Fonts.brand,
    fontSize: FontSize.xs,
    color: Colors.text,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 77, 77, 0.08)",
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  infoText: {
    flex: 1,
    fontFamily: Fonts.brand,
    fontSize: FontSize.xs,
    color: Colors.text,
    lineHeight: 14,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(231, 76, 60, 0.08)",
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E74C3C20",
  },
  warningText: {
    flex: 1,
    fontFamily: Fonts.brand,
    fontSize: FontSize.xs,
    color: Colors.text,
    lineHeight: 14,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  primaryBtnText: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.text,
    letterSpacing: 0.2,
  },
  emptyStateContainer: {
    paddingHorizontal: 16,
    paddingTop: 40,
    alignItems: "center",
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateMessage: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});
