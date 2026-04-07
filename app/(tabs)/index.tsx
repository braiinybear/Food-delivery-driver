import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { usePartnerStore } from "@/store/userider";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { FontSize, Fonts } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import { AppUser } from "@/types/user";
import { RiderWelcomeScreen } from "@/components/RiderWelcomeScreen";
import ApplicationStatusScreen from "@/components/ApplicationStatusScreen";
import { Tabs } from "expo-router";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { useCancelActiveDelivery, useCompleteDelivery, useToggleDriverStatus } from "@/hooks/useDriverDeliveries";
import { useCurrentDelivery, useDriverEarnings, useOrderRoute } from "@/hooks/useDriverOrders";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useDeliveryProfile } from "@/hooks/useRiderInfo";
import { useSocketStore } from "@/store/useSocketStore";

function DriverHomeContent() {
  const [otp, setOtp] = useState("");

  const { mutate: toggleStatus, isPending: isTogglingStatus } = useToggleDriverStatus();
  const { mutate: completeDelivery, isPending: isCompletingDelivery } = useCompleteDelivery();
  const { mutate: cancelActiveDelivery, isPending: isCancellingDelivery } = useCancelActiveDelivery();
  const { data: deliveryProfile } = useDeliveryProfile();
  const { data: currentDelivery } = useCurrentDelivery();
  const { data: earnings, isLoading: earningsLoading } = useDriverEarnings();
  const setAcceptedOrder = useSocketStore((state) => state.setAcceptedOrder);
  const trackingStatus = useSocketStore((state) => state.trackingStatus);

  const activeDelivery = currentDelivery?.order ?? null;
  const activeOrderId = activeDelivery?.id ?? null;
  const driverProfileId = deliveryProfile?.id ?? null;
  const driverStatus = deliveryProfile?.status ?? "OFFLINE";
  const hasActiveDelivery = !!activeOrderId;
  const isBusy = driverStatus === "BUSY" || hasActiveDelivery;
  const isAvailable = driverStatus === "ONLINE" && !hasActiveDelivery;
  const { data: routeData } = useOrderRoute(activeOrderId);

  const { isTracking } = useLocationTracking(
    isAvailable || isBusy,
    activeOrderId,
    driverProfileId,
  );

  useEffect(() => {
    setAcceptedOrder(activeOrderId);
  }, [activeOrderId, setAcceptedOrder]);

  const handleToggleStatus = () => {
    if (isBusy) {
      return;
    }

    toggleStatus(isAvailable ? 'OFFLINE' : 'ONLINE', {
      onSuccess: () => {
        // Query invalidation updates the UI from backend truth.
      },
      onError: (error) => {
        console.log('Failed to toggle status:', error);
      },
    });
  };

  const handleCompleteDelivery = () => {
    const normalizedOtp = otp.trim();
    if (!activeOrderId || normalizedOtp.length < 4) {
      return;
    }

    completeDelivery(
      { orderId: activeOrderId, otp: normalizedOtp },
      {
        onSuccess: () => {
          setOtp("");
          setAcceptedOrder(null);
        },
      },
    );
  };

  const handleCancelActiveDelivery = () => {
    if (!activeOrderId || isCancellingDelivery) {
      return;
    }

    Alert.alert(
      "Cancel delivery?",
      "This will release the order and send it back for another rider.",
      [
        { text: "Keep Delivery", style: "cancel" },
        {
          text: "Cancel Delivery",
          style: "destructive",
          onPress: () => {
            cancelActiveDelivery(activeOrderId, {
              onSuccess: () => {
                setOtp("");
                setAcceptedOrder(null);
              },
            });
          },
        },
      ],
    );
  };

  const displayStatus = trackingStatus ?? activeDelivery?.status ?? driverStatus;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header - Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.greeting}>Welcome Back</Text>
              <Text style={styles.driverName}>Driver</Text>
            </View>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: isBusy
                    ? "#FF6B35"
                    : isAvailable
                      ? "#4CAF50"
                      : "#CCC",
                },
              ]}
            >
              <Ionicons
                name={isBusy ? "bicycle" : isAvailable ? "checkmark-circle" : "close-circle"}
                size={32}
                color="#FFF"
              />
            </View>
          </View>

          {/* Toggle Online Button */}
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: isAvailable ? '#FF6B35' : '#FF9800' },
              isTogglingStatus && { opacity: 0.6 },
              isBusy && { opacity: 0.6 },
            ]}
            onPress={handleToggleStatus}
            disabled={isTogglingStatus || isBusy}
          >
            {isTogglingStatus ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons
                  name={isBusy ? "bicycle" : isAvailable ? 'checkmark-done' : 'play'}
                  size={18}
                  color="#FFF"
                />
                <Text style={styles.toggleText}>
                  {hasActiveDelivery
                    ? "On Delivery"
                    : isBusy
                      ? "Syncing Delivery"
                      : isAvailable
                        ? 'Go Offline'
                        : 'Go Online'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Location Tracking Status */}
          {(isAvailable || isBusy) && (
            <View style={styles.locationStatus}>
              <Ionicons
                name={isTracking ? 'location' : 'location-outline'}
                size={16}
                color={isTracking ? '#4CAF50' : isBusy ? '#FFC107' : '#5B5B5B'}
              />
              <Text
                style={[
                  styles.locationStatusText,
                  { color: isTracking ? '#4CAF50' : isBusy ? '#FFC107' : '#5B5B5B' },
                ]}
              >
                {hasActiveDelivery
                  ? isTracking
                    ? 'Live order tracking is active'
                    : 'Starting live order tracking...'
                  : isBusy
                    ? 'Syncing active delivery state...'
                  : isTracking
                    ? 'Availability location is active for new offers'
                    : 'Starting location sharing for new offers...'}
              </Text>
            </View>
          )}
        </View>

        {/* Current Delivery Card */}
        {activeDelivery ? (
          <View style={styles.currentDeliveryCard}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="navigate" size={20} color="#FF6B35" />
              <Text style={styles.cardTitle}>Current Delivery</Text>
            </View>

            <View style={styles.deliveryInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Customer</Text>
                <Text style={styles.infoValue}>{activeDelivery.customer?.name || "Customer"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Restaurant</Text>
                <Text style={styles.infoValue}>{activeDelivery.restaurant?.name || "Restaurant"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Items</Text>
                <Text style={styles.infoValue}>{activeDelivery.items?.length || 0}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={[styles.infoValue, { color: '#FF6B35', fontWeight: '700' }]}>
                  {displayStatus}
                </Text>
              </View>
              {routeData?.pickup?.address ? (
                <View style={styles.routeInfoBlock}>
                  <Text style={styles.routeInfoLabel}>Pickup</Text>
                  <Text style={styles.routeInfoValue}>{routeData.pickup.address}</Text>
                </View>
              ) : null}
              {routeData?.dropoff?.address ? (
                <View style={styles.routeInfoBlock}>
                  <Text style={styles.routeInfoLabel}>Dropoff</Text>
                  <Text style={styles.routeInfoValue}>{routeData.dropoff.address}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.deliveryActionGroup}>
              <Text style={styles.otpLabel}>Delivery OTP</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter customer OTP"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.otpInput}
              />
              <TouchableOpacity
                style={[
                  styles.deliveryActionBtn,
                  (otp.trim().length < 4 || isCompletingDelivery) && { opacity: 0.6 },
                ]}
                onPress={handleCompleteDelivery}
                disabled={otp.trim().length < 4 || isCompletingDelivery}
              >
                {isCompletingDelivery ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                    <Text style={styles.deliveryActionText}>Complete Delivery</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cancelDeliveryBtn,
                  isCancellingDelivery && { opacity: 0.6 },
                ]}
                onPress={handleCancelActiveDelivery}
                disabled={isCancellingDelivery}
              >
                {isCancellingDelivery ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={16} color="#FFF" />
                    <Text style={styles.deliveryActionText}>Cancel Delivery</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noDeliveryCard}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
            <Text style={styles.noDeliveryText}>No active deliveries</Text>
            <Text style={styles.noDeliverySubtext}>
              {isAvailable
                ? 'Accept orders from the Orders tab to start delivering'
                : 'Go online to receive delivery offers'}
            </Text>
          </View>
        )}

        {/* Earnings Summary */}
        {earningsLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : earnings ? (
          <View style={styles.earningsGrid}>
            <View style={styles.earningsCard}>
              <Ionicons name="checkmark-done" size={24} color="#4CAF50" />
              <Text style={styles.earningsValue}>{earnings.totalDeliveries || 0}</Text>
              <Text style={styles.earningsLabel}>Deliveries</Text>
            </View>

            <View style={styles.earningsCard}>
              <Ionicons name="star" size={24} color="#FFB800" />
              <Text style={styles.earningsValue}>
                {(earnings.rating || 0).toFixed(1)}
              </Text>
              <Text style={styles.earningsLabel}>Rating</Text>
            </View>

            <View style={styles.earningsCard}>
              <Ionicons name="people" size={24} color="#FF6B35" />
              <Text style={styles.earningsValue}>
                {earnings.ratingCount || 0}
              </Text>
              <Text style={styles.earningsLabel}>Reviews</Text>
            </View>
          </View>
        ) : null}

        {/* Quick Stats */}
        <View style={styles.quickStatsCard}>
          <Text style={styles.statsTitle}>Driver Snapshot</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={styles.statValue}>
              {displayStatus}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Vehicle</Text>
            <Text style={styles.statValue}>
              {deliveryProfile?.vehicleType || "Pending"}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Customer Ratings</Text>
            <Text style={styles.statValue}>
              {earnings?.ratingCount || 0}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
   const insets = useSafeAreaInsets();
  const { appliedForRider, _hasHydrated } = usePartnerStore();
  const { data: session } = authClient.useSession();
  const user = session?.user as AppUser | undefined;

  if (!_hasHydrated) return null;

  if (session && user?.role !== "DELIVERY_PARTNER" && !appliedForRider) {
    return (
      <>
        <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
        <SafeAreaView style={{ flex: 1, paddingTop: insets.top }}>
          <RiderWelcomeScreen />
        </SafeAreaView>
      </>
    );
  } else if (appliedForRider) {

    return (
      <>
        <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
        <SafeAreaView style={{ flex: 1, paddingTop: insets.top }}>
          <ApplicationStatusScreen />
        </SafeAreaView>
      </>
    );

  }

  return <DriverHomeContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  statusCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 4,
  },
  statusIndicator: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  locationStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  currentDeliveryCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  deliveryInfo: {
    marginBottom: 12,
  },
  routeInfoBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  routeInfoLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  routeInfoValue: {
    fontSize: 12,
    color: "#1A1A1A",
    fontWeight: "600",
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  deliveryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelDeliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D64545',
    paddingVertical: 10,
    borderRadius: 8,
  },
  deliveryActionGroup: {
    gap: 10,
  },
  deliveryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },
  otpInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    backgroundColor: "#F9FAFB",
  },
  noDeliveryCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  noDeliveryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 16,
  },
  noDeliverySubtext: {
    fontSize: 12,
    color: '#558B2F',
    marginTop: 8,
    textAlign: 'center',
  },
  earningsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  earningsCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
  },
  earningsLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  quickStatsCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  notiBadge: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    top: 8,
    right: 8,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
});
