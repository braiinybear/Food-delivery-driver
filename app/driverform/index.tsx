import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { useApplyDeliveryPartner } from "@/hooks/useDeliveryPartnerRequest";
import { usePartnerStore } from "@/store/userider";
import { uploadImageToCloudinary, validateImage } from "@/utility/cloudinary";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const VEHICLE_TYPES = ["Bike", "Scooter", "Car"];

// ─── Driver Application Form Screen ────────────────────────────────────────────
export default function DriverFormScreen() {
  const { setAppliedForRider } = usePartnerStore();
  const { mutate: applyAsRider, isPending: isLoading } =
    useApplyDeliveryPartner();

  const [vehicleType, setVehicleType] = useState("Bike");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [licenseFrontUrl, setLicenseFrontUrl] = useState("");
  const [licenseBackUrl, setLicenseBackUrl] = useState("");
  const [vehicleRcUrl, setVehicleRcUrl] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [showVehicleMenu, setShowVehicleMenu] = useState(false);
  const [isCloudinaryUploading, setIsCloudinaryUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProfilePicUploading, setIsProfilePicUploading] = useState(false);
  const [profilePicProgress, setProfilePicProgress] = useState(0);

  const pickImage = async (setImageUrl: (url: string) => void) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // ─── Validate image before uploading ─────────────────────────────
        try {
          await validateImage(imageUri, 5); // 5MB max
        } catch (validationError) {
          Alert.alert(
            "Invalid Image",
            validationError instanceof Error
              ? validationError.message
              : "Please select a valid image",
          );
          return;
        }

        // ─── Start cloudinary upload ────────────────────────────────────
        setIsCloudinaryUploading(true);
        setUploadProgress(0);

        try {
          // ─── Simulate progress (0% → 50%) ──────────────────────────
          const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
              if (prev >= 50) {
                clearInterval(progressInterval);
                return prev;
              }
              return prev + Math.random() * 15;
            });
          }, 200);

          // ─── Upload to Cloudinary ───────────────────────────────────
          const response = await uploadImageToCloudinary(imageUri);

          clearInterval(progressInterval);
          setUploadProgress(100);

          // ─── Store the secure URL ──────────────────────────────────
          setImageUrl(response.secure_url);

          // ─── Show success message ──────────────────────────────────
          Alert.alert(
            "Success! ✅",
            "Image uploaded to cloud successfully",
            [{ text: "OK" }],
          );
        } catch (uploadError) {
          Alert.alert(
            "Upload Failed ❌",
            uploadError instanceof Error
              ? uploadError.message
              : "Failed to upload image to Cloudinary",
            [{ text: "Try Again" }],
          );
        } finally {
          setIsCloudinaryUploading(false);
          setUploadProgress(0);
        }
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "An error occurred",
        [{ text: "OK" }],
      );
    }
  };

  const pickProfilePicture = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1], // Square for profile pic
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // ─── Validate image before uploading ─────────────────────────────
        try {
          await validateImage(imageUri, 3); // 3MB max for profile
        } catch (validationError) {
          Alert.alert(
            "Invalid Image",
            validationError instanceof Error
              ? validationError.message
              : "Please select a valid image",
          );
          return;
        }

        // ─── Start profile picture upload ───────────────────────────────
        setIsProfilePicUploading(true);
        setProfilePicProgress(0);

        try {
          // ─── Simulate progress (0% → 50%) ──────────────────────────
          const progressInterval = setInterval(() => {
            setProfilePicProgress((prev) => {
              if (prev >= 50) {
                clearInterval(progressInterval);
                return prev;
              }
              return prev + Math.random() * 15;
            });
          }, 200);

          // ─── Upload to Cloudinary ───────────────────────────────────
          const response = await uploadImageToCloudinary(
            imageUri,
            "driver_profiles",
          );

          clearInterval(progressInterval);
          setProfilePicProgress(100);

          // ─── Store the secure URL ──────────────────────────────────
          setProfilePicUrl(response.secure_url);

          // ─── Show success message ──────────────────────────────────
          Alert.alert(
            "Success! ✅",
            "Profile picture updated successfully",
            [{ text: "OK" }],
          );
        } catch (uploadError) {
          Alert.alert(
            "Upload Failed ❌",
            uploadError instanceof Error
              ? uploadError.message
              : "Failed to upload profile picture",
            [{ text: "Try Again" }],
          );
        } finally {
          setIsProfilePicUploading(false);
          setProfilePicProgress(0);
        }
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "An error occurred",
        [{ text: "OK" }],
      );
    }
  };

  const validateForm = () => {
    if (!licenseNumber.trim()) {
      Alert.alert("Missing Info", "Please enter your license number");
      return false;
    }
    if (!vehiclePlate.trim()) {
      Alert.alert("Missing Info", "Please enter your vehicle plate number");
      return false;
    }
    if (!licenseFrontUrl) {
      Alert.alert(
        "Missing Document",
        "Please upload the front side of your license",
      );
      return false;
    }
    if (!licenseBackUrl) {
      Alert.alert(
        "Missing Document",
        "Please upload the back side of your license",
      );
      return false;
    }
    if (!vehicleRcUrl) {
      Alert.alert(
        "Missing Document",
        "Please upload your vehicle registration certificate",
      );
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    applyAsRider(
      {
        vehicleType: vehicleType as any,
        licenseNumber,
        vehiclePlate,
        licenseFrontUrl,
        licenseBackUrl,
        vehicleRcUrl,
        profilePicUrl: profilePicUrl || "",
      },
      {
        onSuccess: (data) => {
          setAppliedForRider(true);
          Alert.alert(
            "Application Submitted! 🎉",
            `Your delivery partner application has been submitted.\n\nStatus: ${data.status}\nVehicle: ${data.vehicleType}\n\nOur team will review and get back to you within 24-48 hours.`,
            [
              {
                text: "OK",
                onPress: () => router.push("/(tabs)"),
              },
            ],
          );
        },
        onError: (error: any) => {
          if (error?.response?.status === 409) {
            Alert.alert(
              "Application Already Exists",
              "You already have an existing delivery partner application. Please check back soon!",
              [{ text: "OK" }],
            );
            setAppliedForRider(true);
          } else {
            Alert.alert(
              "Submission Failed",
              error?.response?.data?.message ||
                "Failed to submit application. Please try again.",
              [{ text: "OK" }],
            );
          }
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Cloudinary Upload Loading Overlay */}
      {isCloudinaryUploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingModal}>
            <View style={styles.uploadingIcon}>
              <Ionicons name="cloud-upload-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.uploadingTitle}>Uploading to Cloud</Text>
            <Text style={styles.uploadingSubtitle}>
              Please wait while we upload your document
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(uploadProgress, 99)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressPercentage}>
                {Math.round(Math.min(uploadProgress, 99))}%
              </Text>
            </View>

            {/* Loading Spinner */}
            <View style={styles.loadingSpinnerContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>

            <Text style={styles.uploadingHint}>
              This typically takes 5-15 seconds
            </Text>
          </View>
        </View>
      )}

      {/* Profile Picture Upload Loading Overlay */}
      {isProfilePicUploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingModal}>
            <View style={styles.uploadingIcon}>
              <Ionicons name="person-circle-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.uploadingTitle}>Uploading Profile Picture</Text>
            <Text style={styles.uploadingSubtitle}>
              Please wait while we upload your profile picture
            </Text>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(profilePicProgress, 99)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressPercentage}>
                {Math.round(Math.min(profilePicProgress, 99))}%
              </Text>
            </View>

            {/* Loading Spinner */}
            <View style={styles.loadingSpinnerContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>

            <Text style={styles.uploadingHint}>
              This typically takes 5-10 seconds
            </Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Information</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Body */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: "50%" }]} />
            </View>
            <Text style={styles.progressText}>Step 1 of 2</Text>
          </View>

          {/* Intro Section */}
          <View style={styles.introSection}>
            <Ionicons name="bicycle" size={40} color={Colors.primary} />
            <Text style={styles.introTitle}>Vehicle Details</Text>
            <Text style={styles.introDesc}>
              Tell us about your vehicle so we can verify your eligibility
            </Text>
          </View>

          {/* Profile Picture Section */}
          <View style={styles.profilePicSection}>
            <TouchableOpacity
              onPress={pickProfilePicture}
              disabled={isProfilePicUploading}
              activeOpacity={0.7}
            >
              <View style={styles.profilePicContainer}>
                {profilePicUrl ? (
                  <>
                    <Image
                      source={{ uri: profilePicUrl }}
                      style={styles.profilePic}
                    />
                    <View style={styles.profilePicOverlay}>
                      <Ionicons
                        name="camera-outline"
                        size={24}
                        color={Colors.white}
                      />
                    </View>
                  </>
                ) : (
                  <View style={styles.profilePicPlaceholder}>
                    <Ionicons
                      name="person-circle-outline"
                      size={50}
                      color={Colors.primary}
                    />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.profilePicLabel}>
              <Text style={styles.profilePicLabelText}>Profile Picture</Text>
              <Text style={styles.profilePicLabelSubtext}>
                {profilePicUrl ? "Tap to change" : "Tap to upload"}
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Vehicle Type */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Vehicle Type *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowVehicleMenu(!showVehicleMenu)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownText}>{vehicleType}</Text>
                <Ionicons
                  name={showVehicleMenu ? "chevron-up" : "chevron-down"}
                  size={22}
                  color={Colors.primary}
                />
              </TouchableOpacity>
              {showVehicleMenu && (
                <View style={styles.dropdownMenu}>
                  {VEHICLE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.dropdownItem,
                        vehicleType === type && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setVehicleType(type);
                        setShowVehicleMenu(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          vehicleType === type && styles.dropdownItemTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                      {vehicleType === type && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={Colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* License Number */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>License Number *</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={Colors.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="DL1234567890"
                  placeholderTextColor={Colors.muted}
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  editable={!isLoading}
                />
              </View>
              <Text style={styles.helperText}>
                Your valid driver&apos;s license number
              </Text>
            </View>

            {/* Vehicle Plate */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Vehicle Plate Number *</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="car-outline"
                  size={20}
                  color={Colors.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="DL01AB1234"
                  placeholderTextColor={Colors.muted}
                  value={vehiclePlate}
                  onChangeText={setVehiclePlate}
                  editable={!isLoading}
                />
              </View>
              <Text style={styles.helperText}>
                Your vehicle&apos;s registration number
              </Text>
            </View>

            {/* Document Upload Section */}
            <View style={styles.documentsSection}>
              <Text style={styles.sectionTitle}>Upload Documents</Text>
              <Text style={styles.sectionDesc}>
                These documents help us verify your identity and vehicle
              </Text>

              {/* License Front */}
              <DocumentUploadCard
                icon="image-outline"
                title="License Front"
                subtitle="Upload front side of your license"
                isLoading={isLoading}
                onPress={() => pickImage(setLicenseFrontUrl)}
                isUploaded={!!licenseFrontUrl}
              />

              {/* License Back */}
              <DocumentUploadCard
                icon="image-outline"
                title="License Back"
                subtitle="Upload back side of your license"
                isLoading={isLoading}
                onPress={() => pickImage(setLicenseBackUrl)}
                isUploaded={!!licenseBackUrl}
              />

              {/* Vehicle RC */}
              <DocumentUploadCard
                icon="document-outline"
                title="Vehicle RC"
                subtitle="Upload registration certificate"
                isLoading={isLoading}
                onPress={() => pickImage(setVehicleRcUrl)}
                isUploaded={!!vehicleRcUrl}
              />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons
                name="information-circle"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.infoText}>
                All documents are required. They will be verified by our team
                within 24-48 hours
              </Text>
            </View>

            {/* Progress Summary */}
            <View style={styles.progressSummary}>
              <ProgressItem
                icon="document-text-outline"
                label="License Number"
                completed={!!licenseNumber.trim()}
              />
              <ProgressItem
                icon="car-outline"
                label="Vehicle Plate"
                completed={!!vehiclePlate.trim()}
              />
              <ProgressItem
                icon="image-outline"
                label="License Documents"
                completed={!!licenseFrontUrl && !!licenseBackUrl}
              />
              <ProgressItem
                icon="document-outline"
                label="Vehicle RC"
                completed={!!vehicleRcUrl}
              />
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.submitBtnText}>Submitting...</Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={Colors.white}
                  />
                  <Text style={styles.submitBtnText}>Submit Application</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Progress Item Component ──────────────────────────────────────────────────
function ProgressItem({
  icon,
  label,
  completed,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  completed: boolean;
}) {
  return (
    <View style={styles.progressItem}>
      <View
        style={[
          styles.progressItemIcon,
          completed && styles.progressItemIconCompleted,
        ]}
      >
        <Ionicons
          name={completed ? "checkmark" : icon}
          size={18}
          color={completed ? Colors.success : Colors.muted}
        />
      </View>
      <Text
        style={[
          styles.progressItemLabel,
          completed && styles.progressItemLabelCompleted,
        ]}
      >
        {label}
      </Text>
      {completed && (
        <Ionicons name="checkmark-done" size={16} color={Colors.success} />
      )}
    </View>
  );
}

// ─── Document Upload Card Component ────────────────────────────────────────────
function DocumentUploadCard({
  icon,
  title,
  subtitle,
  isLoading,
  onPress,
  isUploaded,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  isLoading: boolean;
  onPress: () => void;
  isUploaded: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.uploadCard, isUploaded && styles.uploadCardUploaded]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.uploadCardLeft}>
        <View
          style={[
            styles.uploadCardIcon,
            isUploaded && styles.uploadCardIconSuccess,
          ]}
        >
          <Ionicons
            name={isUploaded ? "checkmark" : icon}
            size={24}
            color={isUploaded ? Colors.success : Colors.primary}
          />
        </View>
        <View style={styles.uploadCardText}>
          <Text style={styles.uploadCardTitle}>{title}</Text>
          <Text style={styles.uploadCardSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons
        name={isUploaded ? "checkmark-done" : "chevron-forward"}
        size={22}
        color={isUploaded ? Colors.success : Colors.primary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.light,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
  },
  progressText: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.xs,
    color: Colors.muted,
    textAlign: "right",
  },
  introSection: {
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 16,
  },
  introTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  introDesc: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownText: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  dropdownMenu: {
    position: "absolute",
    top: 125,
    left: 20,
    right: 20,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light,
  },
  dropdownItemActive: {
    backgroundColor: Colors.primaryLight,
  },
  dropdownItemText: {
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.text,
    paddingVertical: 12,
  },
  helperText: {
    fontFamily: Fonts.brand,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 6,
  },
  documentsSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionDesc: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 16,
  },
  uploadCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  uploadCardUploaded: {
    backgroundColor: "rgba(46, 204, 113, 0.05)",
    borderColor: Colors.success,
    borderStyle: "solid",
  },
  uploadCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  uploadCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadCardIconSuccess: {
    backgroundColor: "rgba(46, 204, 113, 0.2)",
  },
  uploadCardText: {
    flex: 1,
  },
  uploadCardTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: 2,
  },
  uploadCardSubtitle: {
    fontFamily: Fonts.brand,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 77, 77, 0.05)",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  infoText: {
    flex: 1,
    fontFamily: Fonts.brand,
    fontSize: FontSize.xs,
    color: Colors.text,
    lineHeight: 16,
  },
  buttonContainer: {
    gap: 10,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  cancelBtn: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.md,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  progressSummary: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  progressItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light,
    justifyContent: "center",
    alignItems: "center",
  },
  progressItemIconCompleted: {
    backgroundColor: "rgba(46, 204, 113, 0.2)",
  },
  progressItemLabel: {
    flex: 1,
    fontFamily: Fonts.brandMedium,
    fontSize: FontSize.sm,
    color: Colors.muted,
  },
  progressItemLabelCompleted: {
    color: Colors.text,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  uploadingModal: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 30,
    width: "80%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    alignItems: "center",
  },
  uploadingIcon: {
    marginBottom: 16,
  },
  uploadingTitle: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.lg,
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  uploadingSubtitle: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  progressBarContainer: {
    width: "100%",
    marginBottom: 16,
    alignItems: "center",
    gap: 8,
  },
  progressBarBackground: {
    width: "100%",
    height: 8,
    backgroundColor: Colors.light,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
  },
  progressPercentage: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  loadingSpinnerContainer: {
    marginVertical: 16,
  },
  uploadingHint: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.xs,
    color: Colors.muted,
    textAlign: "center",
    marginTop: 12,
  },
  profilePicSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: "rgba(0, 77, 77, 0.05)",
    borderRadius: 16,
    gap: 16,
  },
  profilePicContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light,
  },
  profilePicOverlay: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profilePicPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  profilePicLabel: {
    flex: 1,
  },
  profilePicLabelText: {
    fontFamily: Fonts.brandBold,
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: 2,
  },
  profilePicLabelSubtext: {
    fontFamily: Fonts.brand,
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
});
