import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { FontSize, Fonts } from "@/constants/typography";
import {
  useInfiniteNotifications,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
} from "@/hooks/useNotifications";
import { Notification } from "@/types/notification";
import { showAlert } from "@/store/useAlertStore";
import { useNotification } from "@/context/NotificationContext";

export default function NotificationsScreen() {
  const { Colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(Colors, isDark), [Colors, isDark]);
  const { handleNotificationNavigation } = useNotification();

  // Fetch notifications with infinite scroll
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteNotifications();

  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAllPending } = useMarkAllNotificationsAsRead();

  // Flatten the pages of notifications
  const notifications = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const unreadCount = data?.pages[0]?.unreadCount ?? 0;

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;
    markAllAsRead(undefined, {
      onSuccess: () => {
        showAlert("Success", "All notifications marked as read.");
      },
      onError: (err) => {
        showAlert("Error", "Could not mark all as read. Please try again.");
      },
    });
  };

  const handleNotificationPress = (item: Notification) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }
    if (handleNotificationNavigation && item.data) {
      handleNotificationNavigation(item.data);
    } else {
      showAlert(item.title, item.body);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ORDER":
        return { name: "bicycle-outline", color: Colors.primary };
      case "PROMO":
        return { name: "gift-outline", color: Colors.success };
      case "SYSTEM":
      default:
        return { name: "notifications-outline", color: Colors.textSecondary };
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);
    const dateFormatted = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.isRead && styles.unreadCard,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.color + "15" }]}>
          <Ionicons name={icon.name as any} size={22} color={icon.color} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.notificationTitle,
                !item.isRead && styles.unreadTitleText,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>

          <Text
            style={[
              styles.notificationBody,
              !item.isRead && styles.unreadBodyText,
            ]}
            numberOfLines={2}
          >
            {item.body}
          </Text>

          <Text style={styles.timestamp}>{dateFormatted}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
     
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={Colors.background} />

      {/* NOTIFICATION FEED */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={() => {
            if (isFetchingNextPage) {
              return (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              );
            }
            return null;
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="notifications-off-outline" size={48} color={Colors.muted} />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                No new notifications. We'll alert you when there is an update.
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const createStyles = (Colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },

    readAllButton: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    readAllText: {
      fontSize: FontSize.xs,
      fontFamily: Fonts.brandBold,
      color: Colors.primary,
    },
    loaderContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    listContent: {
      padding: 16,
      paddingBottom: 40,
      flexGrow: 1,
    },
    notificationCard: {
      flexDirection: "row",
      backgroundColor: Colors.surface,
      borderRadius: 16,
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
    unreadCard: {
      borderColor: Colors.primary + "30",
      backgroundColor: isDark ? "#12213A" : "#FFFBF2", // Dynamic highlight for unread
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "flex-start",
    },
    contentContainer: {
      flex: 1,
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    notificationTitle: {
      fontSize: FontSize.md,
      fontFamily: Fonts.brandBold,
      color: Colors.textSecondary,
      flex: 1,
      marginRight: 8,
    },
    unreadTitleText: {
      color: Colors.text,
      fontFamily: Fonts.brandBlack,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.primary,
    },
    notificationBody: {
      fontSize: FontSize.sm,
      fontFamily: Fonts.brand,
      color: Colors.muted,
      lineHeight: 20,
      marginBottom: 8,
    },
    unreadBodyText: {
      color: Colors.textSecondary,
      fontFamily: Fonts.brandMedium,
    },
    timestamp: {
      fontSize: 10,
      fontFamily: Fonts.brandMedium,
      color: Colors.muted,
    },
    footerLoader: {
      paddingVertical: 16,
      alignItems: "center",
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 80,
      paddingHorizontal: 32,
    },
    emptyIconBg: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.surface,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    emptyTitle: {
      fontSize: FontSize.lg,
      fontFamily: Fonts.brandBold,
      color: Colors.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: FontSize.sm,
      fontFamily: Fonts.brand,
      color: Colors.muted,
      textAlign: "center",
      lineHeight: 20,
    },
  });
