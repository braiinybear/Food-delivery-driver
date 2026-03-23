import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import { router } from "expo-router";
import React, { useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
    ActivityIndicator,
    Alert,
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
            Alert.alert("Error", "Please fill in all fields");
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
                    Alert.alert("Success", "Account created successfully", [
                        { text: "OK", onPress: () => router.replace("/") }
                    ]);
                },
                onError: (ctx: any) => {
                    setIsLoading(false);
                    Alert.alert("Registration Failed", ctx.error.message);
                },
            }
        );
    };

    const handleGoogleRegister = async () => {
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: "food-delivery-customer:///",
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
                    <Text style={styles.switchText}>Already have an account? Sign In</Text>
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
        justifyContent: "center",
        backgroundColor: Colors.background,
    },
    logo: {
        width: 200,
        height: 200,
        alignSelf: "center",
        marginBottom: 4,
    },

    // ── Section ────────────────────────────────────────────────
    section: {
        width: "100%",
        marginBottom: 8,
    },
    sectionLabel: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: 10,
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },

    // ── Inputs ───────────────────────────────────────────────
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 14,
        borderRadius: 12,
        marginBottom: 14,
        fontSize: FontSize.md,
        fontFamily: Fonts.brand,
        backgroundColor: Colors.background,
        color: Colors.text,
    },

    // ── Buttons ──────────────────────────────────────────────
    primaryButton: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    primaryButtonText: {
        color: Colors.white,
        fontSize: FontSize.md,
        fontFamily: Fonts.brandBold,
    },
    buttonDisabled: {
        opacity: 0.6,
    },

    // ── Divider ──────────────────────────────────────────────
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 20,
    },
    divider: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: {
        marginHorizontal: 12,
        color: Colors.muted,
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.xs,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },

    // ── Google ───────────────────────────────────────────────
    googleButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 12,
        borderRadius: 12,
        backgroundColor: Colors.background,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
        marginBottom: 8,
    },
    googleIcon: { width: 35, height: 35 },
    googleButtonText: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontFamily: Fonts.brandMedium,
    },

    // ── Switch ───────────────────────────────────────────────
    switchContainer: { marginTop: 20, alignItems: "center" },
    switchText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontFamily: Fonts.brandMedium,
    },
    referralCodeText: {
        color: Colors.primary,
        fontSize: FontSize.sm,
        fontFamily: Fonts.brandMedium,
        textAlign: "center",
        marginBottom: 10,
        textDecorationLine: "underline",
    },
    referralCodeInput: {
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 15,
        borderRadius: 12,
        backgroundColor: Colors.background,
        fontSize: FontSize.md,
        fontFamily: Fonts.brand,
        color: Colors.text,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        marginBottom: 8,
    }
});
