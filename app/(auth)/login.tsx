import { useTheme } from "@/context/ThemeContext";
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

type Step = "phone" | "otp";

export default function Login() {
    const { Colors, isDark } = useTheme();
    const styles = React.useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);

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
            showAlert("Error", "Please enter a valid phone number");
            return;
        }
        setOtpLoading(true);
        try {
            await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
            setStep("otp");
        } catch (err: any) {
            showAlert("Error", err?.message ?? "Failed to send OTP");
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            showAlert("Error", "Please enter the OTP");
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
                        showAlert("Verification Failed", ctx.error.message);
                    }
                }
            );
        } catch (err: any) {
            showAlert("Error", err?.message ?? "Verification failed");
        } finally {
            setVerifyLoading(false);
        }
    };

    // ── Email / Password ───────────────────────────────────────
    const handleEmailLogin = async () => {
        if (!email || !password) {
            showAlert("Error", "Please fill in all fields");
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
                        showAlert("Login Error", "Could not retrieve session token.");
                    }
                },
                onError: (ctx: any) => {
                    setEmailLoading(false);
                    showAlert("Login Failed", ctx.error.message);
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
            behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                    <Text style={styles.switchText}>New to the team? <Text style={styles.switchTextLink}>Create an account</Text></Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (Colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 24,
        paddingBottom: 40,
        justifyContent: "center",
        backgroundColor: Colors.background,
    },
    logo: {
        width: 120,
        height: 120,
        alignSelf: "center",
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

    // ── Phone Row ─────────────────────────────────────────────
    phoneRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 12,
    },
    countryCode: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: Colors.surface,
        minWidth: 85,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countryCodeText: {
        fontFamily: Fonts.brandBold,
        fontSize: 16,
        color: Colors.text,
    },
    phoneInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 18,
        paddingHorizontal: 18,
        paddingVertical: 14,
        fontSize: 16,
        fontFamily: Fonts.brandMedium,
        backgroundColor: Colors.background,
        color: Colors.text,
    },

    // ── OTP ──────────────────────────────────────────────────
    otpHint: {
        fontFamily: Fonts.brandMedium,
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 16,
        textAlign: 'center',
        backgroundColor: Colors.surface,
        padding: 12,
        borderRadius: 12,
    },
    changePhone: {
        fontFamily: Fonts.brandBold,
        color: Colors.primary,
        textDecorationLine: 'underline',
    },
    otpInput: {
        textAlign: "center",
        fontSize: 24,
        fontFamily: Fonts.brandBlack,
        letterSpacing: 8,
        paddingVertical: 16,
    },
    resendRow: {
        alignItems: "center",
        marginTop: 16,
    },
    resendText: {
        fontFamily: Fonts.brandBold,
        fontSize: 14,
        color: Colors.primary,
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
        backgroundColor: isDark ? Colors.primary : Colors.secondary,
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
    secondaryButton: {
        backgroundColor: isDark ? Colors.primary : Colors.secondary,
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
    secondaryButtonText: {
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

    // ── Login mode toggle ─────────────────────────────────────
    toggleRow: {
        alignItems: "center",
        marginTop: 16,
    },
    toggleText: {
        color: Colors.primary,
        fontSize: 14,
        fontFamily: Fonts.brandBold,
        textDecorationLine: 'underline',
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
