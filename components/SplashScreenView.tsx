import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/typography";
import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet } from "react-native";

export default function SplashScreenView({
    onFinish,
}: {
    onFinish: () => void;
}) {
    const logoScale = useRef(new Animated.Value(0.7)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const screenOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            // 1. Logo pops in
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    friction: 5,
                    tension: 80,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]),
            // 2. App name fades in
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 350,
                useNativeDriver: true,
            }),
            // 3. Tagline fades in
            Animated.timing(taglineOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            // 4. Hold for a moment
            Animated.delay(600),
            // 5. Entire screen fades out
            Animated.timing(screenOpacity, {
                toValue: 0,
                duration: 450,
                useNativeDriver: true,
            }),
        ]).start(() => onFinish());
    }, [logoOpacity, logoScale, onFinish, screenOpacity, taglineOpacity, textOpacity]);

    return (
        <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
            <Animated.View
                style={[
                    styles.logoWrapper,
                    { opacity: logoOpacity, transform: [{ scale: logoScale }] },
                ]}
            >
                <Image
                    source={require("@/assets/images/app-logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.background,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
    },
    logoWrapper: {
        marginBottom: 16,
    },
    logo: {
        width: 160,
        height: 160,
    },
    appName: {
        fontFamily: Fonts.brandBlack,
        fontSize: 36,
        color: Colors.primary,
        letterSpacing: 1,
    },
    tagline: {
        fontFamily: Fonts.brandMedium,
        fontSize: 15,
        color: Colors.textSecondary,
        marginTop: 8,
    },
});
