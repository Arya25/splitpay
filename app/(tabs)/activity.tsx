import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { ActivityService, Activity, ActivityExpense, ActivitySettlement } from "../../services/ActivityService";
import { useUserStore } from "../../src/store/userStore";
import { formatCurrency, getCurrencySymbol } from "../../src/utils/currency";
import { User } from "../../src/types/models";
import { UserService } from "../../services/UserService";

export default function ActivityScreen() {
  const { currentUser } = useUserStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState<Record<string, User>>({});
  const [primaryCurrency, setPrimaryCurrency] = useState<string>("INR");

  useEffect(() => {
    if (currentUser) {
      loadActivities();
    }
  }, [currentUser]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser) {
        loadActivities();
      }
    }, [currentUser])
  );

  const loadActivities = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      const [activitiesData, usersData] = await Promise.all([
        ActivityService.getUserActivities(currentUser.user_id),
        UserService.getAllUsers(),
      ]);

      setActivities(activitiesData);

      // Calculate most common currency from expense activities
      const expenseActivities = activitiesData.filter(
        (a) => a.activity_type === "EXPENSE"
      );
      if (expenseActivities.length > 0) {
        const currencyCounts: Record<string, number> = {};
        expenseActivities.forEach((activity) => {
          if (activity.activity_type === "EXPENSE" && activity.expense?.currency) {
            const curr = activity.expense.currency;
            currencyCounts[curr] = (currencyCounts[curr] || 0) + 1;
          }
        });
        if (Object.keys(currencyCounts).length > 0) {
          const mostCommonCurrency = Object.entries(currencyCounts).reduce((a, b) =>
            currencyCounts[a[0]] > currencyCounts[b[0]] ? a : b
          )[0];
          setPrimaryCurrency(mostCommonCurrency);
        } else {
          setPrimaryCurrency("INR");
        }
      } else {
        setPrimaryCurrency("INR");
      }

      // Create user map for quick lookup
      const map: Record<string, User> = {};
      usersData.forEach((user) => {
        map[user.user_id] = user;
      });
      setUserMap(map);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string): string => {
    if (userId === currentUser?.user_id) return "You";
    return userMap[userId]?.user_name || "Unknown";
  };

  const isExpenseActivity = (activity: Activity): activity is ActivityExpense => {
    return activity.activity_type === "EXPENSE";
  };

  const isSettlementActivity = (activity: Activity): activity is ActivitySettlement => {
    return activity.activity_type === "SETTLEMENT";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#33306b" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <Text style={styles.headerSubtitle}>
          {activities.length} {activities.length === 1 ? "activity" : "activities"}
        </Text>
      </View>

      {activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="activity" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>No activities yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Your expense activities will appear here
          </Text>
        </View>
      ) : (
        <View style={styles.activitiesList}>
          {activities.map((activity) => {
            if (isExpenseActivity(activity)) {
              const expense = activity.expense;
              const isCreatedByUser = expense?.created_by === currentUser?.user_id;
              const isInGroup = activity.group_id !== null;
              const creator = expense?.created_by ? userMap[expense.created_by] : null;
              const creatorName = creator?.user_name || "Unknown";
              const creatorInitial = creatorName.charAt(0).toUpperCase();

              return (
                <TouchableOpacity
                  key={activity.activity_id}
                  style={styles.activityCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityIconContainer}>
                    {creator?.profile_image_url && creator.profile_image_url.trim() !== "" ? (
                      <Image
                        source={{ uri: creator.profile_image_url }}
                        style={styles.activityUserImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.activityUserImagePlaceholder}>
                        <Text style={styles.activityUserImageText}>{creatorInitial}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityTitle}>
                        {isCreatedByUser
                          ? "You created an expense"
                          : "Expense added"}
                      </Text>
                      {expense && (
                        <Text style={styles.activityAmount}>
                          {formatCurrency(expense.amount, expense.currency)}
                        </Text>
                      )}
                    </View>
                    {expense && (
                      <Text style={styles.activityDescription} numberOfLines={1}>
                        {expense.description}
                      </Text>
                    )}
                    <View style={styles.activityMeta}>
                      {isInGroup && activity.group && (
                        <View style={styles.activityTag}>
                          <Feather name="users" size={12} color="#6b7280" />
                          <Text style={styles.activityTagText}>
                            {activity.group.group_name}
                          </Text>
                        </View>
                      )}
                      {!isInGroup && (
                        <View style={styles.activityTag}>
                          <Feather name="user" size={12} color="#6b7280" />
                          <Text style={styles.activityTagText}>Individual</Text>
                        </View>
                      )}
                      <Text style={styles.activityDate}>
                        {new Date(activity.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            } else if (isSettlementActivity(activity)) {
              const fromUser = activity.from_user || userMap[activity.from_user_id];
              const toUser = activity.to_user || userMap[activity.to_user_id];
              const isFromUser = activity.from_user_id === currentUser?.user_id;
              const isToUser = activity.to_user_id === currentUser?.user_id;

              return (
                <TouchableOpacity
                  key={activity.activity_id}
                  style={styles.activityCard}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.activityIconContainer,
                      activity.status === "SUCCESS"
                        ? styles.settlementSuccess
                        : styles.settlementFailed,
                    ]}
                  >
                    <Feather
                      name={activity.status === "SUCCESS" ? "check" : "x"}
                      size={20}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityTitle}>
                        {isFromUser
                          ? `You paid ${getUserName(activity.to_user_id)}`
                          : isToUser
                          ? `${getUserName(activity.from_user_id)} paid you`
                          : `${getUserName(activity.from_user_id)} paid ${getUserName(activity.to_user_id)}`}
                      </Text>
                      <Text
                        style={[
                          styles.activityAmount,
                          activity.status === "SUCCESS"
                            ? styles.settlementAmountSuccess
                            : styles.settlementAmountFailed,
                        ]}
                      >
                        {formatCurrency(activity.amount, primaryCurrency)}
                      </Text>
                    </View>
                    <View style={styles.activityMeta}>
                      <View
                        style={[
                          styles.statusBadge,
                          activity.status === "SUCCESS"
                            ? styles.statusSuccess
                            : styles.statusFailed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            activity.status === "SUCCESS"
                              ? styles.statusTextSuccess
                              : styles.statusTextFailed,
                          ]}
                        >
                          {activity.status}
                        </Text>
                      </View>
                      <Text style={styles.activityDate}>
                        {new Date(activity.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }
            return null;
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    paddingTop: 100,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
  activitiesList: {
    padding: 16,
  },
  activityCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  activityUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  activityUserImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
  },
  activityUserImageText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  settlementSuccess: {
    backgroundColor: "#10b981",
  },
  settlementFailed: {
    backgroundColor: "#ef4444",
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    marginRight: 8,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  settlementAmountSuccess: {
    color: "#10b981",
  },
  settlementAmountFailed: {
    color: "#ef4444",
  },
  activityDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  activityMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  activityTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  activityTagText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
  },
  activityDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusSuccess: {
    backgroundColor: "#d1fae5",
  },
  statusFailed: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextSuccess: {
    color: "#10b981",
  },
  statusTextFailed: {
    color: "#ef4444",
  },
});
