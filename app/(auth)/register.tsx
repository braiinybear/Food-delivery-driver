import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import { showAlert } from "@/store/useAlertStore";
import { router } from "expo-router";
import React, { useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function Register() {
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [haveReferralCode, setHaveReferralCode] = useState<boolean>(false);
    const [referralCode, setReferralCode] = useState<string>("");

    const handleRegister = async () => {
        if (!name || !email || !password) {
            showAlert("Error", "Please fill in all fields");
            return;
        }

        setIsLoading(true);

        await authClient.signUp.email(
            { name, email, password },
            {
                body: haveReferralCode ? { invitedByCode: referralCode } : undefined,
                onSuccess: async (ctx) => {
                    // 1. Extract token directly from the response body (ctx.data)
                    const apiToken = ctx.data?.token;
                    if (apiToken) {
                        // 2. Save it to SecureStore under the name "token"
                        await SecureStore.setItemAsync("token", apiToken);
                        console.log("✅ Token successfully saved as 'token':", apiToken);
                        router.replace("/");
                    }

                    setIsLoading(false);
                    showAlert("Success", "Account created successfully", [
                        { text: "OK", onPress: () => router.replace("/") }
                    ]);
                },
                onError: (ctx: any) => {
                    setIsLoading(false);
                    showAlert("Registration Failed", ctx.error.message);
                },
            }
        );
    };

    const handleGoogleRegister = async () => {
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "fooddeliverydriver:///",
            });
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                {/* Logo */}
                <Image
                    source={require("@/assets/images/app-logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />

             
                {/* ── Email Sign-up Section ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Create Account</Text>

                    <TextInput
                        placeholder="Full Name"
                        placeholderTextColor={Colors.muted}
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                    />

                    <TextInput
                        placeholder="Email Address"
                        placeholderTextColor={Colors.muted}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                    />

                    <TextInput
                        placeholder="Password"
                        placeholderTextColor={Colors.muted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        style={styles.input}
                    />
                    {
                        haveReferralCode && (
                            <TextInput
                                placeholder="Enter referral code"
                                placeholderTextColor={Colors.muted}
                                value={referralCode}
                                onChangeText={setReferralCode}
                                style={[styles.input, styles.referralCodeInput]}
                            />
                        )
                    }
                    {
                        !haveReferralCode && (
                            <Text onPress={() => setHaveReferralCode(true)} style={styles.referralCodeText}>Have a referral code?</Text>
                        )
                    }
                    <TouchableOpacity
                        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <ActivityIndicator color="#fff" />
                                <Text style={styles.primaryButtonText}>Creating Account...</Text>
                            </>
                        ) : (
                            <Text style={styles.primaryButtonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── Divider ── */}
                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>or continue with</Text>
                    <View style={styles.divider} />
                </View>

                {/* ── Google ── */}
                <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleRegister}
                    disabled={isLoading}
                >
                    <Image
                        source={require("@/assets/images/google-logo.png")}
                        style={styles.googleIcon}
                        resizeMode="contain"
                    />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                {/* ── Sign in link ── */}
                <TouchableOpacity
                    onPress={() => router.push("/(auth)/login")}
                    style={styles.switchContainer}
                >
                    <Text style={styles.switchText}>Already have an account? <Text style={styles.switchTextLink}>Sign In</Text></Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        paddingBottom: 40,
        backgroundColor: Colors.background,
    },
    logo: {
        width: 140,
        height: 140,
        alignSelf: "center",
        marginTop: 60,
        marginBottom: 20,
    },
    headerContainer: {
        marginBottom: 32,
        alignItems: "center",
    },
    title: {
        fontSize: 32,
        fontFamily: Fonts.brandBlack,
        color: Colors.text,
        textAlign: "center",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: Fonts.brandMedium,
        color: Colors.textSecondary,
        textAlign: "center",
        paddingHorizontal: 20,
    },

    // ── Section ────────────────────────────────────────────────
    section: {
        width: "100%",
        marginBottom: 8,
    },
    sectionLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 1.2,
        paddingLeft: 4,
    },

    // ── Inputs ───────────────────────────────────────────────
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 18,
        marginBottom: 16,
        fontSize: 16,
        fontFamily: Fonts.brandMedium,
        backgroundColor: Colors.background,
        color: Colors.text,
    },

    // ── Buttons ──────────────────────────────────────────────
    primaryButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontFamily: Fonts.brandBold,
    },
    buttonDisabled: {
        opacity: 0.7,
    },

    // ── Divider ──────────────────────────────────────────────
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 32,
    },
    divider: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: {
        marginHorizontal: 16,
        color: Colors.muted,
        fontFamily: Fonts.brandMedium,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 1,
    },

    // ── Google ───────────────────────────────────────────────
    googleButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingVertical: 14,
        borderRadius: 18,
        backgroundColor: Colors.background,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 12,
    },
    googleIcon: { width: 24, height: 24 },
    googleButtonText: {
        color: Colors.text,
        fontSize: 16,
        fontFamily: Fonts.brandBold,
    },

    // ── Switch ───────────────────────────────────────────────
    switchContainer: { 
        marginTop: 24, 
        alignItems: "center",
        paddingBottom: 20,
    },
    switchText: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontFamily: Fonts.brandMedium,
    },
    switchTextLink: {
        color: Colors.primary,
        fontFamily: Fonts.brandBold,
    },
    referralCodeText: {
        color: Colors.primary,
        fontSize: 14,
        fontFamily: Fonts.brandBold,
        textAlign: "center",
        marginTop: 16,
        marginBottom: 8,
    },
    referralCodeInput: {
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 18,
        backgroundColor: Colors.surface,
        fontSize: 16,
        fontFamily: Fonts.brandBold,
        color: Colors.text,
        textAlign: 'center',
        letterSpacing: 2,
    }
});
