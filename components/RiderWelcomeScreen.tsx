import { Colors } from "@/constants/colors";
import { Fonts, FontSize } from "@/constants/typography";
import { authClient } from "@/lib/auth-client";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ─── Welcome / Delivery Partner Onboarding Screen ──────────────────────────────
export function RiderWelcomeScreen() {
    const { data: session } = authClient.useSession();
    const firstName = session?.user?.name?.split(" ")[0] ?? "Partner";

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            {/* Top curved background */}
            <View style={styles.topBg}>
                <View style={styles.iconCircle}>
                    <Ionicons name="bicycle" size={52} color={Colors.white} />
                </View>
                <Text style={styles.greeting}>Hello, {firstName}! 👋</Text>
                <Text style={styles.tagline}>Ready to earn on your terms?</Text>
            </View>

            {/* Content */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Feature Cards */}
                <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: "#E8F5E9" }]}>
                        <Ionicons name="cash-outline" size={24} color={Colors.success} />
                    </View>
                    <View style={styles.featureText}>
                        <Text style={styles.featureTitle}>Earn Daily Rewards</Text>
                        <Text style={styles.featureDesc}>
                            Get paid for every delivery. Bonus incentives for top performers.
                        </Text>
                    </View>
                </View>

                <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: "#FFF3E0" }]}>
                        <Ionicons name="alarm-outline" size={24} color={Colors.warning} />
                    </View>
                    <View style={styles.featureText}>
                        <Text style={styles.featureTitle}>Flexible Hours</Text>
                        <Text style={styles.featureDesc}>
                            Work when you want. Choose your own hours and locations.
                        </Text>
                    </View>
                </View>

                <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: "#FCE4EC" }]}>
                        <Ionicons name="heart-outline" size={24} color="#E91E63" />
                    </View>
                    <View style={styles.featureText}>
                        <Text style={styles.featureTitle}>Support & Insurance</Text>
                        <Text style={styles.featureDesc}>
                            24/7 support team and delivery protection coverage included.
                        </Text>
                    </View>
                </View>

                <View style={styles.featureCard}>
                    <View style={[styles.featureIcon, { backgroundColor: "#E0F2F1" }]}>
                        <Ionicons name="trophy-outline" size={24} color="#009688" />
                    </View>
                    <View style={styles.featureText}>
                        <Text style={styles.featureTitle}>Track Achievements</Text>
                        <Text style={styles.featureDesc}>
                            Unlock badges and compete on leaderboards for extra rewards.
                        </Text>
                    </View>
                </View>

                {/* Stats strip */}
                <View style={styles.statsStrip}>
                    <View style={styles.stat}>
                        <Text style={styles.statNum}>2.5K+</Text>
                        <Text style={styles.statLbl}>Active Riders</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={styles.statNum}>₹500/day</Text>
                        <Text style={styles.statLbl}>Avg Earnings</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={styles.statNum}>4.7 ⭐</Text>
                        <Text style={styles.statLbl}>Avg Rating</Text>
                    </View>
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                    style={styles.ctaBtn}
                    activeOpacity={0.85}
                    onPress={() => router.push("/driverform")}
                >
                    <Ionicons name="checkmark-circle-outline" size={22} color={Colors.white} />
                    <Text style={styles.ctaBtnText}>Start Earning Now</Text>
                </TouchableOpacity>

                {/* Secondary CTA */}
                <TouchableOpacity
                    style={styles.secondaryBtn}
                    activeOpacity={0.75}
                >
                    <Text style={styles.secondaryBtnText}>Learn More</Text>
                </TouchableOpacity>
                <Text style={styles.footerNote}>
                    Quick verification. Start delivering within 24 hours! 🚀
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    topBg: {
        backgroundColor: Colors.primary,
        paddingTop: 60,
        paddingBottom: 60,
        alignItems: "center",
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.3)",
    },
    greeting: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xxl,
        color: Colors.white,
        marginBottom: 6,
    },
    tagline: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.sm,
        color: "rgba(255,255,255,0.75)",
        letterSpacing: 0.5,
    },
    content: {
        padding: 20,
        paddingTop: 24,
    },
    featureCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        gap: 14,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    featureIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.text,
        marginBottom: 4,
    },
    featureDesc: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    statsStrip: {
        flexDirection: "row",
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 18,
        marginBottom: 24,
        marginTop: 8,
        justifyContent: "space-around",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border,
    },
    stat: {
        alignItems: "center",
    },
    statNum: {
        fontFamily: Fonts.brandBlack,
        fontSize: FontSize.xl,
        color: Colors.primary,
    },
    statLbl: {
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: Colors.border,
    },
    ctaBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 17,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        shadowColor: Colors.primary,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 5,
        marginBottom: 12,
    },
    ctaBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.white,
        letterSpacing: 0.5,
    },
    secondaryBtn: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        paddingVertical: 15,
        borderWidth: 2,
        borderColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    secondaryBtnText: {
        fontFamily: Fonts.brandBold,
        fontSize: FontSize.md,
        color: Colors.primary,
        letterSpacing: 0.5,
    },
    footerNote: {
        textAlign: "center",
        fontFamily: Fonts.brand,
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginBottom: 20,
    },
});
