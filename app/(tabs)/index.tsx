import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePartnerStore } from "@/store/userider";
import { showAlert } from "@/store/useAlertStore";
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import Constants from "expo-constants";
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Bottom sheet snap points (as distance from TOP) ───
const SNAP_TOP = SCREEN_HEIGHT * 0.25;   // Sheet takes 75% of screen
const SNAP_BOTTOM = SCREEN_HEIGHT * 0.52; // Sheet takes ~48% of screen (starts higher)

// ─── Decode Google's encoded polyline into lat/lng array ───
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

// ─── Premium Google Maps Style ────────────────────────────────────────────────
const PREMIUM_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

// ─── Haversine ETA calculator (fallback when Google API key is unavailable) ───
function calculateHaversineEta(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
    avgSpeedKmh: number = 25
): string {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c * 1.4; // ~1.4x for road distance
    const etaMinutes = Math.max(2, Math.round((distanceKm / avgSpeedKmh) * 60));
    return `~${etaMinutes} min`;
}

function DriverHomeContent() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [otp, setOtp] = useState("");
  const mapRef = useRef<MapView>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeEta, setRouteEta] = useState<string | null>(null);
  const GOOGLE_MAPS_APIKEY = Constants.expoConfig?.extra?.googleMapsApiKey || '';

  // ─── Bottom Sheet Animation ───
  const sheetY = useRef(new Animated.Value(SNAP_BOTTOM)).current;
  const lastSheetY = useRef(SNAP_BOTTOM);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const scrollOffsetY = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const snapTo = useCallback((toValue: number) => {
    lastSheetY.current = toValue;
    setIsSheetExpanded(toValue <= SNAP_TOP + 10);
    Animated.spring(sheetY, {
      toValue,
      useNativeDriver: false,
      damping: 20,
      stiffness: 150,
      mass: 0.8,
    }).start();
  }, [sheetY]);

  // Handle drag on the handle bar
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderMove: (_, gestureState) => {
      const newY = lastSheetY.current + gestureState.dy;
      const clampedY = Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, newY));
      sheetY.setValue(clampedY);
    },
    onPanResponderRelease: (_, gestureState) => {
      const currentY = lastSheetY.current + gestureState.dy;
      const midPoint = (SNAP_TOP + SNAP_BOTTOM) / 2;
      if (gestureState.vy < -0.5) {
        snapTo(SNAP_TOP);
      } else if (gestureState.vy > 0.5) {
        snapTo(SNAP_BOTTOM);
      } else {
        snapTo(currentY < midPoint ? SNAP_TOP : SNAP_BOTTOM);
      }
    },
  }), [snapTo, sheetY]);

  // Handle touch on the ScrollView area — drives sheet up first, then scrolls
  const contentPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => {
      // Only intercept vertical drags when sheet is NOT fully expanded
      if (!isSheetExpanded && Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx)) {
        return true;
      }
      // When expanded and user is scrolled to top, intercept downward drags to collapse
      if (isSheetExpanded && scrollOffsetY.current <= 2 && g.dy > 8) {
        return true;
      }
      return false;
    },
    onPanResponderMove: (_, gestureState) => {
      const newY = lastSheetY.current + gestureState.dy;
      const clampedY = Math.max(SNAP_TOP, Math.min(SNAP_BOTTOM, newY));
      sheetY.setValue(clampedY);
    },
    onPanResponderRelease: (_, gestureState) => {
      const currentY = lastSheetY.current + gestureState.dy;
      const midPoint = (SNAP_TOP + SNAP_BOTTOM) / 2;
      if (gestureState.vy < -0.4) {
        snapTo(SNAP_TOP);
      } else if (gestureState.vy > 0.4) {
        snapTo(SNAP_BOTTOM);
        // Reset scroll to top when collapsing
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        const target = currentY < midPoint ? SNAP_TOP : SNAP_BOTTOM;
        snapTo(target);
        if (target === SNAP_BOTTOM) {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }
      }
    },
  }), [snapTo, sheetY, isSheetExpanded]);

  const handleScrollEvent = useCallback((e: any) => {
    scrollOffsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

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

  // Auto-expand sheet when active delivery exists
  useEffect(() => {
    if (hasActiveDelivery) {
      snapTo(SNAP_TOP);
    }
  }, [hasActiveDelivery, snapTo]);

  // ─── Fetch route from Google Directions API or OSRM fallback ───
  const fetchRoute = useCallback(async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ) => {
    try {
      if (GOOGLE_MAPS_APIKEY) {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&key=${GOOGLE_MAPS_APIKEY}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.routes?.length > 0) {
          const route = json.routes[0];
          setRouteCoords(decodePolyline(route.overview_polyline.points));
          setRouteEta(route.legs?.[0]?.duration?.text ?? null);
          return;
        }
      }

      // Fallback to free OSRM routing if Google API is missing or fails
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=polyline`;
      const osrmRes = await fetch(osrmUrl);
      const osrmJson = await osrmRes.json();
      
      if (osrmJson.routes?.length > 0) {
          setRouteCoords(decodePolyline(osrmJson.routes[0].geometry));
          setRouteEta(calculateHaversineEta(
            origin.latitude, origin.longitude,
            destination.latitude, destination.longitude
          ));
      } else {
          setRouteCoords([origin, destination]);
          setRouteEta(calculateHaversineEta(
            origin.latitude, origin.longitude,
            destination.latitude, destination.longitude
          ));
      }
    } catch {
      setRouteCoords([origin, destination]);
      setRouteEta(calculateHaversineEta(
        origin.latitude, origin.longitude,
        destination.latitude, destination.longitude
      ));
    }
  }, [GOOGLE_MAPS_APIKEY]);

  // Fetch route when driver location or destination changes
  useEffect(() => {
    if (!driverLocation || !routeData || !hasActiveDelivery) {
      setRouteCoords([]);
      setRouteEta(null);
      return;
    }
    const dest = displayStatus === 'ON_THE_WAY' && routeData.dropoff
      ? { latitude: routeData.dropoff.lat, longitude: routeData.dropoff.lng }
      : routeData.pickup
      ? { latitude: routeData.pickup.lat, longitude: routeData.pickup.lng }
      : null;
    if (dest) {
      fetchRoute({ latitude: driverLocation.lat, longitude: driverLocation.lng }, dest);
    }
  }, [driverLocation?.lat, driverLocation?.lng, routeData, displayStatus, hasActiveDelivery, fetchRoute]);

  // Re-center map when route or markers change
  useEffect(() => {
    if (!mapRef.current || !driverLocation) return;
    const points: { latitude: number; longitude: number }[] = [
      { latitude: driverLocation.lat, longitude: driverLocation.lng },
    ];
    if (routeData?.pickup?.lat) points.push({ latitude: routeData.pickup.lat, longitude: routeData.pickup.lng });
    if (routeData?.dropoff?.lat && displayStatus === 'ON_THE_WAY') points.push({ latitude: routeData.dropoff.lat, longitude: routeData.dropoff.lng });
    if (routeCoords.length > 2) points.push(routeCoords[Math.floor(routeCoords.length / 2)]);

    if (points.length > 1) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 120, right: 60, bottom: SCREEN_HEIGHT * 0.45, left: 60 },
          animated: true,
        });

        // Tilt the camera into 3D isometric view shortly after bounding box completes
        setTimeout(() => {
            mapRef.current?.animateCamera({ pitch: 55 });
        }, 1500);
      }, 400);
    }
  }, [routeData, displayStatus, driverLocation, routeCoords.length]);

  // Handle real-time cancellations
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeOrderId) return;

    const handleOrderCancelled = (payload: any) => {
      if (payload.orderId === activeOrderId) {
        setAcceptedOrder(null);
        setOtp("");
        queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
        queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
        snapTo(SNAP_BOTTOM);
        showAlert(
          "Order Cancelled ❌",
          payload.reason || "This order was cancelled by the customer or restaurant. Your status has been reset to ONLINE."
        );
      }
    };

    socket.on('order_cancelled', handleOrderCancelled);

    return () => {
      socket.off('order_cancelled', handleOrderCancelled);
    };
  }, [activeOrderId, queryClient, setAcceptedOrder, snapTo]);

  const [dismissedOfferIds, setDismissedOfferIds] = useState<Set<string>>(new Set());

  const handleToggleStatus = () => {
    if (isBusy) return;

    const newStatus = isAvailable ? 'OFFLINE' : 'ONLINE';
    toggleStatus(newStatus, {
      onSuccess: () => {
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
          queryClient.invalidateQueries({ queryKey: ['driver-current-delivery'] });
          queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
          snapTo(SNAP_BOTTOM);
          showAlert("Success", "Delivery completed successfully! Great job.");
        },
        onError: (err: any) => {
          const message = err.response?.data?.message || "Could not complete delivery. Please check the OTP.";
          showAlert("Delivery Failed", message);
        }
      },
    );
  };

  const handlePickupDelivery = () => {
    if (!activeOrderId || isPickingUp) return;
    pickupDelivery(activeOrderId, {
      onSuccess: () => {
        showAlert("Success", "Order picked up! You can now start navigating to the customer.");
      },
      onError: (err: any) => {
        const message = err.response?.data?.message || "Failed to confirm pickup.";
        showAlert("Pickup Failed", message);
      }
    });
  };

  const handleNavigate = () => {
    const destLat = displayStatus === 'ON_THE_WAY' ? routeData?.dropoff?.lat : routeData?.pickup?.lat;
    const destLng = displayStatus === 'ON_THE_WAY' ? routeData?.dropoff?.lng : routeData?.pickup?.lng;

    if (destLat && destLng) {
      Linking.openURL(`https://maps.google.com/maps?daddr=${destLat},${destLng}&directionsmode=driving`);
    } else {
      showAlert("Location Error", "Could not load exact destination coordinates.");
    }
  };

  const handleCancelActiveDelivery = () => {
    if (!activeOrderId || isCancellingDelivery) return;

    showAlert(
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
                snapTo(SNAP_BOTTOM);
                showAlert("Cancelled", "Delivery has been released.");
              },
              onError: (err: any) => {
                const message = err.response?.data?.message || "Failed to cancel delivery.";
                showAlert("Cancel Failed", message);
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
        showAlert("Accept Failed", err.response?.data?.message || "Order is no longer available.");
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

  // ─── Status indicator colors ───
  const statusColor = isBusy ? Colors.secondary : isAvailable ? Colors.success : Colors.muted;
  const statusLabel = isBusy ? "BUSY" : isAvailable ? "ONLINE" : "OFFLINE";

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

      {/* ═══ FULL SCREEN MAP ═══ */}
      <View style={StyleSheet.absoluteFill}>
        {driverLocation ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsBuildings={true}
            pitchEnabled={true}
            userInterfaceStyle="light"
            showsCompass={false}
            toolbarEnabled={false}
            customMapStyle={PREMIUM_MAP_STYLE}
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
              <View style={styles.driverMarkerOuter}>
                <View style={styles.driverMarkerInner}>
                  <Ionicons name="bicycle" size={14} color="#FFF" />
                </View>
              </View>
            </Marker>

            {/* Restaurant Pickup Marker */}
            {hasActiveDelivery && routeData?.pickup?.lat ? (
              <Marker
                 coordinate={{ latitude: routeData.pickup.lat, longitude: routeData.pickup.lng }}
                 title={routeData.pickup.name}
                 description="Restaurant Pickup"
                 anchor={{ x: 0.5, y: 1 }}
              >
                <View style={styles.pinContainer}>
                  <View style={[styles.pinHead, { backgroundColor: Colors.warning }]}>
                    <Ionicons name="restaurant" size={16} color="#FFF" />
                  </View>
                  <View style={[styles.pinTail, { borderTopColor: Colors.warning }]} />
                </View>
              </Marker>
            ) : null}

            {/* Customer Dropoff Marker */}
            {hasActiveDelivery && routeData?.dropoff?.lat ? (
              <Marker
                 coordinate={{ latitude: routeData.dropoff.lat, longitude: routeData.dropoff.lng }}
                 title={routeData.dropoff.name || 'Customer'}
                 description="Customer Dropoff"
                 anchor={{ x: 0.5, y: 1 }}
              >
                <View style={styles.pinContainer}>
                  <View style={[styles.pinHead, { backgroundColor: Colors.success }]}>
                    <Ionicons name="home" size={16} color="#FFF" />
                  </View>
                  <View style={[styles.pinTail, { borderTopColor: Colors.success }]} />
                </View>
              </Marker>
            ) : null}

            {/* Route Polyline */}
            {routeCoords.length >= 2 && (
              <Polyline
                coordinates={routeCoords}
                strokeWidth={routeCoords.length > 2 ? 5 : 3}
                strokeColor={displayStatus === 'ON_THE_WAY' ? Colors.success : Colors.primary}
                lineDashPattern={routeCoords.length <= 2 ? [8, 6] : undefined}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
             <ActivityIndicator size="large" color={Colors.primary} />
             <Text style={styles.mapLoadingText}>Loading map...</Text>
          </View>
        )}
      </View>

      {/* ═══ MAP OVERLAY: ETA Pill ═══ */}
      {hasActiveDelivery && routeEta && (
        <View style={[styles.etaPill, { top: insets.top + 12 }]}>
          <Ionicons name="time-outline" size={14} color="#FFF" />
          <Text style={styles.etaPillText}>{routeEta}</Text>
        </View>
      )}

      {/* ═══ MAP OVERLAY: Status Floating Badge ═══ */}
      {!hasActiveDelivery && (
        <View style={[styles.floatingStatusBadge, { top: insets.top + 12 }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.floatingStatusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      )}

      {/* ═══ INTERACTIVE BOTTOM SHEET ═══ */}
      <Animated.View
        style={[
          styles.sheet,
          { top: sheetY, paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Drag Handle */}
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handleBar} />
        </View>

        <View style={{ flex: 1 }} {...contentPanResponder.panHandlers}>
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
            scrollEnabled={isSheetExpanded}
            nestedScrollEnabled
            onScroll={handleScrollEvent}
            scrollEventThrottle={16}
            bounces={false}
          >
          {/* ─── Status & Toggle Card ─── */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>Welcome Back 👋</Text>
                <View style={styles.nameRow}>
                   <Text style={styles.driverName}>Driver</Text>
                   <View style={[styles.inlineStatusBadge, { backgroundColor: statusColor }]}>
                      <Text style={styles.inlineStatusText}>{statusLabel}</Text>
                   </View>
                </View>
              </View>
              <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
                <Ionicons
                  name={isBusy ? "bicycle" : isAvailable ? "checkmark-circle" : "close-circle"}
                  size={22} color="#FFF"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                {
                  backgroundColor: isAvailable ? Colors.danger : Colors.success,
                },
                isTogglingStatus && { opacity: 0.6 },
                hasActiveDelivery && { opacity: 0.5, backgroundColor: Colors.secondary },
              ]}
              onPress={handleToggleStatus}
              disabled={isTogglingStatus || hasActiveDelivery}
              activeOpacity={0.8}
            >
              {isTogglingStatus ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={hasActiveDelivery ? "bicycle" : isAvailable ? 'power' : 'power'}
                    size={20} color="#FFF"
                  />
                  <Text style={styles.toggleText}>
                    {hasActiveDelivery ? "On Delivery" : isBusy ? "Syncing..." : isAvailable ? 'Go Offline' : 'Go Online'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {(isAvailable || isBusy) && (
              <View style={styles.locationStatus}>
                <View style={[styles.pulsingDot, { backgroundColor: isTracking ? Colors.success : Colors.warning }]} />
                <Text style={[styles.locationStatusText, { color: isTracking ? Colors.success : Colors.warning }]}>
                  {hasActiveDelivery
                    ? isTracking ? 'Live tracking active' : 'Starting tracking...'
                    : isBusy ? 'Syncing delivery state...'
                    : isTracking ? 'Location sharing active' : 'Starting location...'}
                </Text>
              </View>
            )}
          </View>

          {/* ─── Quick Stats (when no delivery) ─── */}
          {!activeDelivery && !earningsLoading && earnings && (
            <View style={styles.earningsGrid}>
              <View style={styles.earningsCard}>
                <View style={[styles.earningsIconBg, { backgroundColor: Colors.success + '18' }]}>
                  <Ionicons name="checkmark-done" size={20} color={Colors.success} />
                </View>
                <Text style={styles.earningsValue}>{earnings.totalDeliveries || 0}</Text>
                <Text style={styles.earningsLabel}>Deliveries</Text>
              </View>
              <View style={styles.earningsCard}>
                <View style={[styles.earningsIconBg, { backgroundColor: Colors.secondary + '18' }]}>
                  <Ionicons name="star" size={20} color={Colors.secondary} />
                </View>
                <Text style={styles.earningsValue}>{(earnings.rating || 0).toFixed(1)}</Text>
                <Text style={styles.earningsLabel}>Rating</Text>
              </View>
            </View>
          )}

          {/* ─── Active Delivery Card ─── */}
          {activeDelivery && (
            <View style={styles.currentDeliveryCard}>
              {/* Card Header */}
              <View style={styles.cardTitleRow}>
                <View style={styles.cardTitleLeft}>
                   <View style={styles.cardTitleIconBg}>
                     <Ionicons name="navigate" size={18} color={Colors.primary} />
                   </View>
                   <Text style={styles.cardTitle}>Active Delivery</Text>
                </View>
                <TouchableOpacity onPress={handleNavigate} style={styles.navigateBtn} activeOpacity={0.8}>
                   <Ionicons name="compass" size={15} color="#FFF" />
                   <Text style={styles.navigateBtnText}>Navigate</Text>
                </TouchableOpacity>
              </View>

              {/* Delivery Details */}
              <View style={styles.deliveryInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Customer</Text>
                  <Text style={styles.infoValue}>{activeDelivery.customer?.name || "Customer"}</Text>
                </View>
                <View style={styles.divider} />
                
                {/* ─── Call Customer Button ─── */}
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Contact</Text>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 }}
                      onPress={() => {
                        if (activeDelivery.customer?.phoneNumber) {
                          Linking.openURL(`tel:${activeDelivery.customer.phoneNumber}`); 
                        } else {
                          showAlert("Error", "Customer phone number not available.");
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={14} color="#FFF" />
                      <Text style={{ color: '#FFF', fontFamily: Fonts.brandBold, fontSize: 12 }}>Call Customer</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Restaurant</Text>
                  <Text style={styles.infoValue}>{activeDelivery.restaurant?.name || "Restaurant"}</Text>
                </View>
                <View style={styles.divider} />

                {/* ─── Order Items ─── */}
                {activeDelivery.items && activeDelivery.items.length > 0 && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Items</Text>
                      <View style={{ alignItems: 'flex-end', flex: 1, paddingLeft: 16 }}>
                        {activeDelivery.items.map((item: any, idx: number) => (
                          <Text key={idx} style={[styles.infoValue, { fontSize: 13, marginBottom: 2 }]} numberOfLines={1}>
                            {item.quantity}x {item.menuItem?.name || 'Item'}
                          </Text>
                        ))}
                      </View>
                    </View>
                    <View style={styles.divider} />
                  </>
                )}

                {/* ─── Order Total ─── */}
                {activeDelivery.totalAmount ? (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Bill Amount</Text>
                      <Text style={[styles.infoValue, { color: Colors.success, fontFamily: Fonts.brandBlack, fontSize: 16 }]}>
                        ₹{activeDelivery.totalAmount.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.divider} />
                  </>
                ) : null}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <View style={styles.statusChip}>
                    <Text style={styles.statusChipText}>
                      {displayStatus.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {displayStatus !== 'ON_THE_WAY' && displayStatus !== 'DELIVERED' && routeData?.pickup?.address ? (
                  <View style={styles.routeInfoBlock}>
                    <View style={styles.routeInfoRow}>
                      <View style={[styles.routeDot, { backgroundColor: Colors.warning }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeInfoLabel}>PICKUP FROM</Text>
                        <Text style={styles.routeInfoValue}>{routeData.pickup.address}</Text>
                      </View>
                    </View>
                  </View>
                ) : null}
                
                {displayStatus === 'ON_THE_WAY' && routeData?.dropoff?.address ? (
                  <View style={styles.routeInfoBlock}>
                    <View style={styles.routeInfoRow}>
                      <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeInfoLabel}>DELIVER TO</Text>
                        <Text style={styles.routeInfoValue}>{routeData.dropoff.address}</Text>
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Action Buttons */}
              <View style={styles.deliveryActionGroup}>
                {displayStatus !== 'ON_THE_WAY' && displayStatus !== 'DELIVERED' ? (
                  <TouchableOpacity
                    style={[
                      styles.deliveryActionBtn,
                      { backgroundColor: Colors.primary },
                      isPickingUp && { opacity: 0.6 },
                    ]}
                    onPress={handlePickupDelivery}
                    disabled={isPickingUp}
                    activeOpacity={0.8}
                  >
                    {isPickingUp ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="bag-check" size={18} color="#FFF" />
                        <Text style={styles.deliveryActionText}>Confirm Pickup</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: 12 }}>
                    <Text style={styles.otpLabel}>Enter Delivery OTP</Text>
                    <TextInput
                      value={otp}
                      onChangeText={setOtp}
                      placeholder="Enter 4-digit OTP"
                      placeholderTextColor={Colors.muted}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={styles.otpInput}
                    />
                    <TouchableOpacity
                      style={[
                        styles.deliveryActionBtn,
                        { backgroundColor: Colors.success },
                        (otp.trim().length < 4 || isCompletingDelivery) && { opacity: 0.6 },
                      ]}
                      onPress={handleCompleteDelivery}
                      disabled={otp.trim().length < 4 || isCompletingDelivery}
                      activeOpacity={0.8}
                    >
                      {isCompletingDelivery ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#FFF" />
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
                  activeOpacity={0.8}
                >
                  {isCancellingDelivery ? (
                    <ActivityIndicator size="small" color={Colors.danger} />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={16} color={Colors.danger} />
                      <Text style={[styles.deliveryActionText, { color: Colors.danger }]}>Cancel Delivery</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
        </View>
      </Animated.View>
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
        <View style={{ flex: 1, backgroundColor: Colors.surface }}>
          <RiderWelcomeScreen />
        </View>
      </>
    );
  } else if (appliedForRider) {
    return (
      <>
        <Tabs.Screen options={{ tabBarStyle: { display: "none" } }} />
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
          <ApplicationStatusScreen />
        </SafeAreaView>
      </>
    );
  }

  return <DriverHomeContent />;
}

// ═══════════════════════════════════════════════════════════════
// STYLES — Premium, Clean, Uber/Ola-grade
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ─── Map ──────────────────────────────────
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  mapLoadingText: {
    marginTop: 12,
    color: Colors.muted,
    fontSize: FontSize.sm,
    fontFamily: Fonts.brand,
  },
  pinContainer: {
    alignItems: 'center',
  },
  pinHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  driverMarkerOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 77, 77, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarkerInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },

  // ─── Map Overlays ─────────────────────────
  etaPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  etaPillText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontFamily: Fonts.brandBold,
    letterSpacing: 0.3,
  },
  floatingStatusBadge: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  floatingStatusText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.brandBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ─── Bottom Sheet ─────────────────────────
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  handleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  sheetScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },

  // ─── Status Card ──────────────────────────
  statusCard: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  greeting: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    fontFamily: Fonts.brand,
    letterSpacing: 0.2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  driverName: {
    fontSize: FontSize.xl,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
  },
  inlineStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  inlineStatusText: {
    fontSize: 10,
    fontFamily: Fonts.brandBold,
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  toggleText: {
    fontSize: FontSize.md,
    fontFamily: Fonts.brandBold,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationStatusText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.brandMedium,
  },

  // ─── Earnings Grid ────────────────────────
  earningsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  earningsCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  earningsIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  earningsValue: {
    fontSize: FontSize.xl,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
  },
  earningsLabel: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginTop: 2,
    fontFamily: Fonts.brand,
  },

  // ─── Active Delivery Card ─────────────────
  currentDeliveryCard: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitleIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
  },
  navigateBtn: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 5,
     backgroundColor: Colors.primary,
     paddingVertical: 8,
     paddingHorizontal: 14,
     borderRadius: 20,
     shadowColor: Colors.primary,
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.25,
     shadowRadius: 4,
     elevation: 3,
  },
  navigateBtnText: {
     color: '#FFF',
     fontSize: FontSize.xs,
     fontFamily: Fonts.brandBold,
  },
  deliveryInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light,
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    fontFamily: Fonts.brand,
  },
  infoValue: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
  },
  statusChip: {
    backgroundColor: Colors.secondary + '18',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.brandBold,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeInfoBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  routeInfoLabel: {
    fontSize: 10,
    color: Colors.muted,
    fontFamily: Fonts.brandBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  routeInfoValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontFamily: Fonts.brandMedium,
    marginTop: 2,
    lineHeight: 20,
  },

  // ─── Action Buttons ───────────────────────
  deliveryActionGroup: {
    gap: 10,
  },
  deliveryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  cancelDeliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.danger + '08',
    borderWidth: 1.5,
    borderColor: Colors.danger + '30',
    paddingVertical: 12,
    borderRadius: 14,
  },
  deliveryActionText: {
    fontSize: FontSize.sm,
    fontFamily: Fonts.brandBold,
    color: '#FFF',
  },
  otpLabel: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.brandBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSize.lg,
    fontFamily: Fonts.brandBold,
    color: Colors.text,
    backgroundColor: Colors.surface,
    textAlign: 'center',
    letterSpacing: 6,
  },
});
