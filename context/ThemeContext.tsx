import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LightTheme, DarkTheme, ThemeType } from '@/constants/colors';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: ThemeMode;
    Colors: ThemeType;
    isDark: boolean;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeMode>('light');

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await SecureStore.getItemAsync('user-theme');
            if (savedTheme) {
                setThemeState(savedTheme as ThemeMode);
            }
        } catch (error) {
            console.error('Failed to load theme', error);
        }
    };

    const setTheme = async (newTheme: ThemeMode) => {
        setThemeState(newTheme);
        try {
            await SecureStore.setItemAsync('user-theme', newTheme);
        } catch (error) {
            console.error('Failed to save theme', error);
        }
    };

    const toggleTheme = () => {
        const currentEffectiveTheme = theme === 'system' ? systemColorScheme : theme;
        setTheme(currentEffectiveTheme === 'dark' ? 'light' : 'dark');
    };

    const isDark = theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';
    const Colors = isDark ? DarkTheme : LightTheme;

    return (
        <ThemeContext.Provider value={{ theme, Colors, isDark, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
