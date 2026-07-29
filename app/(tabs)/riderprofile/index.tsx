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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { FontSize, Fonts } from "@/constants/typography";
import { useDeliveryProfile } from "@/hooks/useRiderInfo";
import { authClient } from "@/lib/auth-client";
import { showAlert } from "@/store/useAlertStore";
import { useQueryClient } from "@tanstack/react-query";
import { clearUserSessionState } from "@/utils/sessionCleanup";
import { useUpdateUser } from "@/hooks/useUpdateUser";
import { uploadImageToCloudinary } from "@/utility/cloudinary";
import * as ImagePicker from "expo-image-picker";

export default function RiderProfileScreen() {
  const { Colors, isDark, toggleTheme, theme, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: deliveryProfile, isLoading, refetch } = useDeliveryProfile();
  const queryClient = useQueryClient();
  const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Error refetching profile:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const updateUser = useUpdateUser();
  const [isUploading, setIsUploading] = React.useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    name: "",
    email: "",
    gender: "",
    dob: "",
  });

  const user = deliveryProfile?.user;
  const isOnline = deliveryProfile?.status === "ONLINE";

  React.useEffect(() => {
    if (user) {
      let formattedDob = "";
      if (user.dob) {
        const d = new Date(user.dob);
        const y = d.getUTCFullYear();
        const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = d.getUTCDate().toString().padStart(2, '0');
        formattedDob = `${y}-${m}-${day}`;
      }
      setEditForm({
        name: user.name || "",
        email: user.email || "",
        gender: user.gender || "",
        dob: formattedDob,
      });
    }
  }, [user]);

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert("Permission Denied", "We need camera roll permissions to change profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      const imageUrl = await uploadImageToCloudinary(uri);
      if (imageUrl) {
        updateUser.mutate({ image: imageUrl.secure_url }, {
          onSuccess: () => {
            showAlert("Success", "Profile picture updated!");
            refetch();
          },
          onError: () => showAlert("Error", "Failed to update profile picture.")
        });
      }
    } catch (e) {
      showAlert("Error", "Image upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = () => {
    updateUser.mutate(editForm, {
      onSuccess: () => {
        setIsEditModalVisible(false);
        showAlert("Success", "Profile updated successfully!");
        refetch();
      },
      onError: () => showAlert("Error", "Failed to update profile.")
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.loaderContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? Colors.background : Colors.secondary} />
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.background }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Profile Picture & Basic Info */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={handleImagePicker} disabled={isUploading} activeOpacity={0.8}>
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
            </TouchableOpacity>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? Colors.success : Colors.muted },
              ]}
            />
            <TouchableOpacity 
              style={styles.cameraIcon} 
              onPress={handleImagePicker} 
              disabled={isUploading}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={14} color="#FFF" />
              )}
            </TouchableOpacity>
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
              setIsEditModalVisible(true);
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

        {/* Settings & Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.actionButton}>
            <View style={[styles.actionIconBg, { backgroundColor: isDark ? '#34b44120' : '#34b44110' }]}>
              <Ionicons 
                name={isDark ? "moon" : "sunny"} 
                size={20} 
                color={isDark ? Colors.primary : Colors.secondary} 
              />
            </View>
            <Text style={styles.actionText}>Dark Mode</Text>
            <TouchableOpacity 
              onPress={toggleTheme}
              style={[
                styles.toggleContainer,
                { backgroundColor: isDark ? Colors.primary : '#E0E1DD' }
              ]}
            >
              <View style={[
                styles.toggleCircle,
                { transform: [{ translateX: isDark ? 20 : 0 }] }
              ]} />
            </TouchableOpacity>
          </View>
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
                  onPress: async () => {
                    try {
                      await authClient.signOut();
                      await clearUserSessionState(queryClient);
                      router.replace("/login");
                    } catch (err) {
                      console.log(err);
                      showAlert("Error", "Failed to sign out. Please try again.");
                    }
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

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScroll}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.textInput, styles.disabledInput]}>
                  <Text style={{ color: Colors.muted }}>{editForm.email}</Text>
                  <Ionicons name="lock-closed" size={14} color={Colors.muted} />
                </View>
                <Text style={styles.inputHelper}>Email cannot be changed</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {["Male", "Female", "Other"].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderChip,
                        editForm.gender === g && styles.genderChipSelected
                      ]}
                      onPress={() => setEditForm({ ...editForm, gender: g })}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.genderChipText,
                        editForm.gender === g && styles.genderChipTextSelected
                      ]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TouchableOpacity
                  style={styles.datePickerTrigger}
                  onPress={() => setIsCalendarVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.datePickerText, !editForm.dob && { color: Colors.muted }]}>
                    {editForm.dob || "YYYY-MM-DD"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, updateUser.isPending && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={updateUser.isPending}
                activeOpacity={0.8}
              >
                {updateUser.isPending ? (
                  <ActivityIndicator color="#0D1B2A" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Simple Date Selector Modal */}
      <Modal
        visible={isCalendarVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setIsCalendarVisible(false)}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.calendarOverlay}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setIsCalendarVisible(false)}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarBody}>
              <Text style={styles.calendarNote}>Please enter date in YYYY-MM-DD format</Text>
              <TextInput
                style={styles.calendarInput}
                value={editForm.dob}
                onChangeText={(text) => setEditForm({ ...editForm, dob: text })}
                placeholder="1995-10-25"
                placeholderTextColor={Colors.muted}
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity
                style={styles.calendarDoneBtn}
                onPress={() => setIsCalendarVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.calendarDoneBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  const { Colors, isDark } = useTheme();
  const styles = createStyles(Colors, isDark);

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

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
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
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderColor: isDark ? Colors.background : Colors.surface,
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
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.surface,
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
    flex: 1,
    color: Colors.text,
  },
  toggleContainer: {
    width: 48,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: 'center',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 3,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "75%",
    paddingTop: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: 18,
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 24,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: Fonts.brandBold,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    fontFamily: Fonts.brand,
    fontSize: 16,
    color: Colors.text,
  },
  disabledInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    opacity: 0.7,
  },
  inputHelper: {
    fontFamily: Fonts.brand,
    fontSize: 10,
    color: Colors.muted,
    marginTop: 6,
    marginLeft: 4,
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  genderChipSelected: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  genderChipText: {
    fontFamily: Fonts.brandBold,
    fontSize: 14,
    color: Colors.text,
  },
  genderChipTextSelected: {
    color: Colors.primary,
  },
  datePickerTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },
  datePickerText: {
    fontFamily: Fonts.brand,
    fontSize: 16,
    color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginTop: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontFamily: Fonts.brandBold,
    fontSize: 16,
    color: "#0D1B2A",
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    width: "100%",
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calendarTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: 16,
    color: Colors.text,
  },
  calendarBody: {
    gap: 16,
  },
  calendarNote: {
    fontFamily: Fonts.brand,
    fontSize: 12,
    color: Colors.muted,
    textAlign: "center",
  },
  calendarInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    textAlign: "center",
    fontSize: 20,
    fontFamily: Fonts.brandBlack,
    color: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  calendarDoneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  calendarDoneBtnText: {
    fontFamily: Fonts.brandBold,
    color: "#0D1B2A",
  },
});
