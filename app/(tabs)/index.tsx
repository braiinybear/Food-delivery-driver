import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  Dimensions,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { Colors } from "@/constants/colors";
import { FontSize, Fonts } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import { AppUser } from "@/types/user";
import { RiderWelcomeScreen } from "@/components/RiderWelcomeScreen";
import { getSocket } from "@/lib/socket-client";
import ApplicationStatusScreen from "@/components/ApplicationStatusScreen";
import { Tabs } from "expo-router";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { useCancelActiveDelivery, useCompleteDelivery, useToggleDriverStatus, usePickupDelivery, useAcceptDelivery, useDeclineDelivery } from "@/hooks/useDriverDeliveries";
import { useCurrentDelivery, useDriverEarnings, useOrderRoute } from "@/hooks/useDriverOrders";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useDeliveryProfile } from "@/hooks/useRiderInfo";
import { useSocketStore } from "@/store/useSocketStore";
import { useSocketOrderOffers } from "@/hooks/useSocketOrders";
import { NewOrderOfferModal } from "@/components/NewOrderOfferModal";

const { width, height } = Dimensions.get('window');

function DriverHomeContent() {
  const queryClient = useQueryClient();
  const [otp, setOtp] = useState("");
  const mapRef = useRef<MapView>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);

  const { mutate: toggleStatus, isPending: isTogglingStatus } = useToggleDriverStatus();
  const { mutate: completeDelivery, isPending: isCompletingDelivery } = useCompleteDelivery();
  const { mutate: pickupDelivery, isPending: isPickingUp } = usePickupDelivery();
  const { mutate: acceptDelivery } = useAcceptDelivery();
  const { mutate: declineDelivery } = useDeclineDelivery();
  const { mutate: cancelActiveDelivery, isPending: isCancellingDelivery } = useCancelActiveDelivery();

  const { data: deliveryProfile } = useDeliveryProfile();
  const { data: currentDelivery } = useCurrentDelivery();
  const { data: earnings, isLoading: earningsLoading } = useDriverEarnings();
  
  const { acceptedOrderId, setAcceptedOrder, trackingStatus, orderOffers, removeOrderOffer } = useSocketStore();
  
  // Register socket listeners for order offers
  useSocketOrderOffers();

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

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setDriverLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  const displayStatus = trackingStatus ?? activeDelivery?.status ?? driverStatus;

  // Re-center map when active delivery or user location changes
  useEffect(() => {
    if (routeData && mapRef.current) {
       const destLat = displayStatus === 'ON_THE_WAY' ? routeData.dropoff?.lat : routeData.pickup?.lat;
       const destLng = displayStatus === 'ON_THE_WAY' ? routeData.dropoff?.lng : routeData.pickup?.lng;

       if (destLat && destLng && driverLocation) {
         mapRef.current.fitToCoordinates(
           [
             { latitude: driverLocation.lat, longitude: driverLocation.lng },
             { latitude: destLat, longitude: destLng },
           ],
           { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true }
         );
       }
    }
  }, [routeData, displayStatus, driverLocation]);

  // Handle real-time cancellations
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeOrderId) return;

    const handleOrderCancelled = (payload: any) => {
      if (payload.orderId === activeOrderId) {
        // 🎉 Reset everything immediately
        setAcceptedOrder(null);
        setOtp("");
        
        // Invalidate queries so the "ONLINE" status and empty delivery state show up
        queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
        queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });

        Alert.alert(
          "Order Cancelled ❌",
          payload.reason || "This order was cancelled by the customer or restaurant. Your status has been reset to ONLINE."
        );
      }
    };

    socket.on('order_cancelled', handleOrderCancelled);

    return () => {
      socket.off('order_cancelled', handleOrderCancelled);
    };
  }, [activeOrderId, queryClient, setAcceptedOrder]);

  const [dismissedOfferIds, setDismissedOfferIds] = useState<Set<string>>(new Set());

  const handleToggleStatus = () => {
    if (isBusy) return;

    const newStatus = isAvailable ? 'OFFLINE' : 'ONLINE';
    toggleStatus(newStatus, {
      onSuccess: () => {
        // Refresh data after status change — replaces the need for polling
        queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
        if (newStatus === 'ONLINE') {
          queryClient.invalidateQueries({ queryKey: ['driver-available-orders'] });
        }
      },
      onError: (error) => console.log('Failed to toggle status:', error),
    });
  };

  const handleCompleteDelivery = () => {
    const normalizedOtp = otp.trim();
    if (!activeOrderId || normalizedOtp.length < 4) return;

    completeDelivery(
      { orderId: activeOrderId, otp: normalizedOtp },
      {
        onSuccess: () => {
          setOtp("");
          setAcceptedOrder(null);
          // Force invalidate all active delivery queries to reset UI
          queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
          queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
          Alert.alert("Success", "Delivery completed successfully! Great job.");
        },
        onError: (err: any) => {
          const message = err.response?.data?.message || "Could not complete delivery. Please check the OTP.";
          Alert.alert("Delivery Failed", message);
        }
      },
    );
  };

  const handlePickupDelivery = () => {
    if (!activeOrderId || isPickingUp) return;
    pickupDelivery(activeOrderId, {
      onSuccess: () => {
        Alert.alert("Success", "Order picked up! You can now start navigating to the customer.");
      },
      onError: (err: any) => {
        const message = err.response?.data?.message || "Failed to confirm pickup.";
        Alert.alert("Pickup Failed", message);
      }
    });
  };

  const handleNavigate = () => {
    const destLat = displayStatus === 'ON_THE_WAY' ? routeData?.dropoff?.lat : routeData?.pickup?.lat;
    const destLng = displayStatus === 'ON_THE_WAY' ? routeData?.dropoff?.lng : routeData?.pickup?.lng;

    if (destLat && destLng) {
      Linking.openURL(`https://maps.google.com/maps?daddr=${destLat},${destLng}&directionsmode=driving`);
    } else {
      Alert.alert("Location Error", "Could not load exact destination coordinates.");
    }
  };

  const handleCancelActiveDelivery = () => {
    if (!activeOrderId || isCancellingDelivery) return;

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
                Alert.alert("Cancelled", "Delivery has been released.");
              },
              onError: (err: any) => {
                const message = err.response?.data?.message || "Failed to cancel delivery.";
                Alert.alert("Cancel Failed", message);
              }
            });
          },
        },
      ],
    );
  };

  const handleAcceptOffer = (orderId: string) => {
    acceptDelivery(orderId, {
      onSuccess: () => {
        removeOrderOffer(orderId);
        setAcceptedOrder(orderId);
      },
      onError: (err: any) => {
        Alert.alert("Accept Failed", err.response?.data?.message || "Order is no longer available.");
        removeOrderOffer(orderId);
      }
    });
  };

  const handleDeclineOffer = (orderId: string) => {
    declineDelivery(orderId, {
      onSuccess: () => removeOrderOffer(orderId),
      onError: () => removeOrderOffer(orderId),
    });
  };

  const handleDismissOffer = (orderId: string) => {
    setDismissedOfferIds(prev => new Set(prev).add(orderId));
  };

  // Filter out dismissed offers for the modal
  const pendingOffers = orderOffers.filter(o => !dismissedOfferIds.has(o.orderId));
  const currentOffer = pendingOffers[0] || null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* NEW ORDER MODAL */}
      <NewOrderOfferModal 
        key={currentOffer?.orderId}
        visible={pendingOffers.length > 0 && !hasActiveDelivery}
        order={currentOffer}
        onAccept={handleAcceptOffer}
        onReject={handleDeclineOffer}
        onDismiss={() => currentOffer && handleDismissOffer(currentOffer.orderId)}
        totalOffers={pendingOffers.length}
      />

      {/* MAP VIEW BACKGROUND */}
      <View style={styles.mapContainer}>
        {driverLocation ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            initialRegion={{
              latitude: driverLocation.lat,
              longitude: driverLocation.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {/* Driver's own location marker */}
            <Marker
              coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
              title="You"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.driverMarker}>
                <View style={styles.driverMarkerDot} />
              </View>
            </Marker>

            {/* Conditional Restaurant Marker */}
            {hasActiveDelivery && displayStatus !== 'ON_THE_WAY' && displayStatus !== 'DELIVERED' && routeData?.pickup?.lat ? (
              <Marker
                 coordinate={{ latitude: routeData.pickup.lat, longitude: routeData.pickup.lng }}
                 title={routeData.pickup.name}
                 description="Restaurant Pickup"
              >
                  <View style={styles.markerContainer}>
                     <Ionicons name="restaurant" size={20} color="#FFF" />
                  </View>
              </Marker>
            ) : null}

            {/* Conditional Customer Dropoff Marker */}
            {hasActiveDelivery && displayStatus === 'ON_THE_WAY' && routeData?.dropoff?.lat ? (
              <Marker
                 coordinate={{ latitude: routeData.dropoff.lat, longitude: routeData.dropoff.lng }}
                 title={routeData.dropoff.name}
                 description="Customer Dropoff"
              >
                 <View style={[styles.markerContainer, { backgroundColor: '#4CAF50' }]}>
                     <Ionicons name="home" size={20} color="#FFF" />
                 </View>
              </Marker>
            ) : null}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
             <ActivityIndicator size="large" color={Colors.primary} />
             <Text style={{ marginTop: 10, color: '#666' }}>Loading map...</Text>
          </View>
        )}
      </View>

      {/* DASHBOARD BOTTOM SHEET */}
      <View style={styles.bottomSheetContainer}>
        <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bottomSheetContent}
        >
          {/* Header - Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View>
                <Text style={styles.greeting}>Welcome Back</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                   <Text style={styles.driverName}>Driver</Text>
                   <View style={[styles.inlineStatusBadge, { backgroundColor: isAvailable ? '#4CAF50' : isBusy ? '#FFB800' : '#888' }]}>
                      <Text style={styles.inlineStatusText}>{driverStatus}</Text>
                   </View>
                </View>
              </View>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: isBusy ? "#FF6B35" : isAvailable ? "#4CAF50" : "#CCC" },
                ]}
              >
                <Ionicons
                  name={isBusy ? "bicycle" : isAvailable ? "checkmark-circle" : "close-circle"}
                  size={24} color="#FFF"
                />
              </View>
            </View>

              <TouchableOpacity
              style={[
                styles.toggleButton,
                { backgroundColor: isAvailable ? '#FF6B35' : '#FF9800' },
                isTogglingStatus && { opacity: 0.6 },
                hasActiveDelivery && { opacity: 0.6 },
              ]}
              onPress={handleToggleStatus}
              disabled={isTogglingStatus || hasActiveDelivery}
            >
              {isTogglingStatus ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name={isBusy ? "bicycle" : isAvailable ? 'checkmark-done' : 'play'} size={18} color="#FFF" />
                  <Text style={styles.toggleText}>
                    {hasActiveDelivery ? "On Delivery" : isBusy ? "Syncing Delivery" : isAvailable ? 'Go Offline' : 'Go Online'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {(isAvailable || isBusy) && (
              <View style={styles.locationStatus}>
                <Ionicons
                  name={isTracking ? 'location' : 'location-outline'}
                  size={14} color={isTracking ? '#4CAF50' : isBusy ? '#FFC107' : '#5B5B5B'}
                />
                <Text style={[styles.locationStatusText, { color: isTracking ? '#4CAF50' : isBusy ? '#FFC107' : '#5B5B5B' }]}>
                  {hasActiveDelivery
                    ? isTracking ? 'Live order tracking is active' : 'Starting live order tracking...'
                    : isBusy ? 'Syncing active delivery state...'
                    : isTracking ? 'Location is active for new offers' : 'Starting location sharing...'}
                </Text>
              </View>
            )}
          </View>

          {/* Current Delivery Card */}
          {activeDelivery ? (
            <View style={styles.currentDeliveryCard}>
              <View style={styles.cardTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                   <Ionicons name="navigate" size={20} color="#FF6B35" />
                   <Text style={styles.cardTitle}>Active Delivery</Text>
                </View>
                <TouchableOpacity onPress={handleNavigate} style={styles.navigateBtn}>
                   <Ionicons name="compass" size={16} color="#FFF" />
                   <Text style={styles.navigateBtnText}>Navigate</Text>
                </TouchableOpacity>
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
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={[styles.infoValue, { color: '#FF6B35', fontWeight: '700' }]}>
                    {displayStatus.replace('_', ' ')}
                  </Text>
                </View>

                {displayStatus !== 'ON_THE_WAY' && displayStatus !== 'DELIVERED' && routeData?.pickup?.address ? (
                  <View style={styles.routeInfoBlock}>
                    <Text style={styles.routeInfoLabel}>Pickup From</Text>
                    <Text style={styles.routeInfoValue}>{routeData.pickup.address}</Text>
                  </View>
                ) : null}
                
                {displayStatus === 'ON_THE_WAY' && routeData?.dropoff?.address ? (
                  <View style={styles.routeInfoBlock}>
                    <Text style={styles.routeInfoLabel}>Dropoff To</Text>
                    <Text style={styles.routeInfoValue}>{routeData.dropoff.address}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.deliveryActionGroup}>
                {displayStatus !== 'ON_THE_WAY' && displayStatus !== 'DELIVERED' ? (
                  <TouchableOpacity
                    style={[
                      styles.deliveryActionBtn,
                      { backgroundColor: '#0025D4' },
                      isPickingUp && { opacity: 0.6 },
                    ]}
                    onPress={handlePickupDelivery}
                    disabled={isPickingUp}
                  >
                    {isPickingUp ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="bag-check" size={16} color="#FFF" />
                        <Text style={styles.deliveryActionText}>Confirm Pickup</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: 10 }}>
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
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.cancelDeliveryBtn, isCancellingDelivery && { opacity: 0.6 }]}
                  onPress={handleCancelActiveDelivery}
                  disabled={isCancellingDelivery}
                >
                  {isCancellingDelivery ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={16} color="#D64545" />
                      <Text style={[styles.deliveryActionText, { color: '#D64545' }]}>Cancel Delivery</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
             !earningsLoading && earnings && (
              <View style={styles.earningsGrid}>
                <View style={styles.earningsCard}>
                  <Ionicons name="checkmark-done" size={20} color="#4CAF50" />
                  <Text style={styles.earningsValue}>{earnings.totalDeliveries || 0}</Text>
                  <Text style={styles.earningsLabel}>Deliveries</Text>
                </View>
                <View style={styles.earningsCard}>
                  <Ionicons name="star" size={20} color="#FFB800" />
                  <Text style={styles.earningsValue}>{(earnings.rating || 0).toFixed(1)}</Text>
                  <Text style={styles.earningsLabel}>Rating</Text>
                </View>
              </View>
             )
          )}
        </ScrollView>
      </View>
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
    backgroundColor: '#EAEAEA',
  },
  mapContainer: {
    width: '100%',
    height: height * 0.55, 
    backgroundColor: '#DFDFDF',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerContainer: {
     backgroundColor: '#FF6B35',
     padding: 8,
     borderRadius: 20,
     borderWidth: 2,
     borderColor: '#FFF',
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.3,
     shadowRadius: 3,
     elevation: 4,
  },
  bottomSheetContainer: {
    flex: 1,
    marginTop: -20,
    backgroundColor: '#F9F9F9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  inlineStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  inlineStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  statusIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FF6B35',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  locationStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  currentDeliveryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  navigateBtn: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 4,
     backgroundColor: '#2E7D32',
     paddingVertical: 6,
     paddingHorizontal: 12,
     borderRadius: 18,
  },
  navigateBtnText: {
     color: '#FFF',
     fontSize: 12,
     fontWeight: '700',
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
    color: "#888",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routeInfoValue: {
    fontSize: 13,
    color: "#222",
    fontWeight: "600",
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },
  deliveryActionGroup: {
    gap: 12,
    marginTop: 10,
  },
  deliveryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelDeliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D64545',
    paddingVertical: 10,
    borderRadius: 10,
  },
  deliveryActionText: {
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    backgroundColor: "#F9FAFB",
  },
  earningsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  earningsCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDEDED',
  },
  earningsValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 6,
  },
  earningsLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    fontWeight: '500',
  },
  driverMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4285F4',
    borderWidth: 2.5,
    borderColor: '#FFF',
  },
});
