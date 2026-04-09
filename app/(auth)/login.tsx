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

type Step = "phone" | "otp";

export default function Login() {

    const [toggleEmailPhoneLogin, settoggleEmailPhoneLogin] = useState<boolean>(false);
    // Phone / OTP state
    const [phone, setPhone] = useState<string>("");
    const [otp, setOtp] = useState<string>("");
    const [step, setStep] = useState<Step>("phone");
    const [otpLoading, setOtpLoading] = useState<boolean>(false);
    const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
    const [haveReferralCode, setHaveReferralCode] = useState<boolean>(false);
    const [referralCode, setReferralCode] = useState<string>("");

    // Email / password state
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [emailLoading, setEmailLoading] = useState<boolean>(false);

    // ── Phone OTP ──────────────────────────────────────────────
    const handleSendOtp = async () => {
        if (!phone || phone.length < 10) {
            Alert.alert("Error", "Please enter a valid phone number");
            return;
        }
        setOtpLoading(true);
        try {
            await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
            setStep("otp");
        } catch (err: any) {
            Alert.alert("Error", err?.message ?? "Failed to send OTP");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            Alert.alert("Error", "Please enter the OTP");
            return;
        }
        setVerifyLoading(true);
        try {
            await authClient.phoneNumber.verify(
                {
                    phoneNumber: phone,
                    code: otp,
                },
                {
                    body: haveReferralCode ? { invitedByCode: referralCode } : undefined,
                    onSuccess: async (ctx) => {
                        const apiToken = ctx.data?.token;
                        if (apiToken) {
                            await SecureStore.setItemAsync("token", apiToken);
                        }
                        router.replace("/");
                    },
                    onError: (ctx) => {
                        Alert.alert("Verification Failed", ctx.error.message);
                    }
                }
            );
        } catch (err: any) {
            Alert.alert("Error", err?.message ?? "Verification failed");
        } finally {
            setVerifyLoading(false);
        }
    };

    // ── Email / Password ───────────────────────────────────────
    const handleEmailLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setEmailLoading(true);

        await authClient.signIn.email(
            { email, password },
            {
                onSuccess: async (ctx) => {
                    setEmailLoading(false);

                    // 1. Get the set-cookie header from the response
                    const setCookie = ctx.response?.headers.get('set-cookie');

                    // 2. Extract the value of better-auth.session_token
                    let tokenToSave = "";

                    if (setCookie) {
                        const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
                        if (match && match[1]) {
                            tokenToSave = decodeURIComponent(match[1]);
                        }
                    }

                    // Fallback: If your backend returns 'token' in the JSON body like the signup did
                    if (!tokenToSave && ctx.data?.token) {
                        tokenToSave = ctx.data.token;
                    }

                    if (tokenToSave) {
                        await SecureStore.setItemAsync("token", tokenToSave);
                        console.log("✅ Login Session Saved:", tokenToSave);
                        router.replace("/");
                    } else {
                        console.error("❌ Failed to extract token from headers or body");
                        Alert.alert("Login Error", "Could not retrieve session token.");
                    }
                },
                onError: (ctx: any) => {
                    setEmailLoading(false);
                    Alert.alert("Login Failed", ctx.error.message);
                },
            }
        );
    };

    // ── Google ─────────────────────────────────────────────────
    const handleGoogleLogin = async () => {
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
                <Image
                    source={require("@/assets/images/app-logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />


                {/* ── PHONE OTP (default) ── */}
                {!toggleEmailPhoneLogin && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>
                            {step === "phone" ? "Sign in with Phone" : "Enter OTP"}
                        </Text>

                        {step === "phone" ? (
                            <>
                                <View style={styles.phoneRow}>
                                    <View style={styles.countryCode}>
                                        <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                                    </View>
                                    <TextInput
                                        placeholder="Phone number"
                                        placeholderTextColor={Colors.muted}
                                        value={phone}
                                        onChangeText={setPhone}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        style={styles.phoneInput}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[styles.primaryButton, otpLoading && styles.buttonDisabled]}
                                    onPress={handleSendOtp}
                                    disabled={otpLoading}
                                >
                                    {otpLoading ? (
                                        <>
                                            <ActivityIndicator color="#fff" />
                                            <Text style={styles.primaryButtonText}>Sending OTP...</Text>
                                        </>
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Send OTP</Text>
                                    )}
                                </TouchableOpacity>

                                {/* Toggle to email */}
                                <TouchableOpacity
                                    style={styles.toggleRow}
                                    onPress={() => settoggleEmailPhoneLogin(true)}
                                >
                                    <Text style={styles.toggleText}>Login with Email instead</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.otpHint}>
                                    OTP sent to +91 {phone}{"  "}
                                    <Text
                                        style={styles.changePhone}
                                        onPress={() => { setStep("phone"); setOtp(""); }}
                                    >
                                        Change
                                    </Text>
                                </Text>

                                <TextInput
                                    placeholder="Enter 6-digit OTP"
                                    placeholderTextColor={Colors.muted}
                                    value={otp}
                                    onChangeText={setOtp}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    style={[styles.input, styles.otpInput]}
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
                                    style={[styles.primaryButton, verifyLoading && styles.buttonDisabled]}
                                    onPress={handleVerifyOtp}
                                    disabled={verifyLoading}
                                >
                                    {verifyLoading ? (
                                        <>
                                            <ActivityIndicator color="#fff" />
                                            <Text style={styles.primaryButtonText}>Verifying...</Text>
                                        </>
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Verify & Login</Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.resendRow}
                                    onPress={handleSendOtp}
                                    disabled={otpLoading}
                                >
                                    <Text style={styles.resendText}>
                                        {otpLoading ? "Resending..." : "Resend OTP"}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                {/* ── EMAIL / PASSWORD (shown when toggled) ── */}
                {toggleEmailPhoneLogin && (
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Email & Password</Text>

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

                        <TouchableOpacity
                            style={[styles.secondaryButton, emailLoading && styles.buttonDisabled]}
                            onPress={handleEmailLogin}
                            disabled={emailLoading}
                        >
                            {emailLoading ? (
                                <>
                                    <ActivityIndicator color="#fff" />
                                    <Text style={styles.secondaryButtonText}>Logging in...</Text>
                                </>
                            ) : (
                                <Text style={styles.secondaryButtonText}>Login with Email</Text>
                            )}
                        </TouchableOpacity>

                        {/* Back to phone */}
                        <TouchableOpacity
                            style={styles.toggleRow}
                            onPress={() => settoggleEmailPhoneLogin(false)}
                        >
                            <Text style={styles.toggleText}>Back to phone login</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── DIVIDER ── */}
                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>or continue with</Text>
                    <View style={styles.divider} />
                </View>

                {/* ── Google ── */}
                <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleLogin}
                >
                    <Image
                        source={require("@/assets/images/google-logo.png")}
                        style={styles.googleIcon}
                        resizeMode="contain"
                    />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                {/* ── Register link ── */}
                <TouchableOpacity
                    onPress={() => router.push("/(auth)/register")}
                    style={styles.switchContainer}
                >
                    <Text style={styles.switchText}>New here? Create an account</Text>
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
    title: {
        fontSize: FontSize.xxl,
        fontFamily: Fonts.brandBold,
        marginBottom: 28,
        textAlign: "center",
        color: Colors.text,
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

    // ── Phone Row ─────────────────────────────────────────────
    phoneRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
        gap: 8,
    },
    countryCode: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        backgroundColor: Colors.surface,
    },
    countryCodeText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    phoneInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: FontSize.md,
        fontFamily: Fonts.brand,
        backgroundColor: Colors.background,
        color: Colors.text,
    },

    // ── OTP ──────────────────────────────────────────────────
    otpHint: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginBottom: 12,
    },
    changePhone: {
        fontFamily: Fonts.brandBold,
        color: Colors.primary,
    },
    otpInput: {
        textAlign: "left",
        fontSize: FontSize.md,
        fontFamily: Fonts.brandBold,
    },
    resendRow: {
        alignItems: "center",
        marginTop: 12,
    },
    resendText: {
        fontFamily: Fonts.brandMedium,
        fontSize: FontSize.sm,
        color: Colors.primary,
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
    secondaryButton: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    secondaryButtonText: {
        color: Colors.white,
        fontSize: FontSize.md,
        fontFamily: Fonts.brandBold,
    },
    emailButton: {
        backgroundColor: Colors.text,
        padding: 5,
        borderRadius: 12,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 8,
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
    emailIcon: { width: 17, height: 17 },
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

    // ── Login mode toggle ─────────────────────────────────────
    toggleRow: {
        alignItems: "center",
        marginTop: 14,
    },
    toggleText: {
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
        fontFamily: Fonts.brandBold,
        color: Colors.text,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        marginBottom: 8,
    }
});
