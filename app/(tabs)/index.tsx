import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ExpenseService } from "../../services/ExpenseService";
import { UserService } from "../../services/UserService";
import { useUserStore } from "../../src/store/userStore";
import { Expense, ExpenseParticipant, ExpensePayer, User } from "../../src/types/models";
import { formatCurrency, getCurrencySymbol } from "../../src/utils/currency";

export default function HomeScreen() {
  const { currentUser } = useUserStore();
  const params = useLocalSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({
    totalOwed: 0,
    totalOwedTo: 0,
    netBalance: 0,
  });
  const [userMap, setUserMap] = useState<Record<string, User>>({});
  const [primaryCurrency, setPrimaryCurrency] = useState<string>("INR");
  
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const toastOpacity = useState(new Animated.Value(0))[0];
  const toastTranslateY = useState(new Animated.Value(-50))[0];

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    
    // Animate in
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(toastTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 3 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastMessage(null);
      });
    }, 3000);
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser) {
        loadData();
      }
    }, [currentUser])
  );

  // Show toast message if expense was saved
  useEffect(() => {
    if (params.expenseSaved === "true") {
      showToast("Expense created successfully! 🎉", "success");
    } else if (params.expenseError === "true") {
      showToast("Failed to save expense. Please try again.", "error");
    }
  }, [params.expenseSaved, params.expenseError]);

  const loadData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Load expenses and balance in parallel
      const [expensesData, balanceData, usersData] = await Promise.all([
        ExpenseService.getUserExpenses(currentUser.user_id),
        ExpenseService.calculateUserBalance(currentUser.user_id),
        UserService.getAllUsers(),
      ]);

      setExpenses(expensesData);
      setBalance(balanceData);

      // Calculate most common currency from expenses
      if (expensesData.length > 0) {
        const currencyCounts: Record<string, number> = {};
        expensesData.forEach((expense) => {
          const curr = expense.currency || "INR";
          currencyCounts[curr] = (currencyCounts[curr] || 0) + 1;
        });
        const mostCommonCurrency = Object.entries(currencyCounts).reduce((a, b) =>
          currencyCounts[a[0]] > currencyCounts[b[0]] ? a : b
        )[0];
        setPrimaryCurrency(mostCommonCurrency);
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
      console.error("Error loading home data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getExpensePayerNames = (payers: ExpensePayer[]): string => {
    const names = payers
      .slice(0, 2)
      .map((p) => {
        const user = userMap[p.user_id];
        if (user?.user_id === currentUser?.user_id) return "You";
        return user?.user_name || "Unknown";
      });
    
    if (payers.length > 2) {
      return `${names.join(", ")} +${payers.length - 2} more`;
    }
    return names.join(" and ");
  };

  const getExpenseParticipantCount = (participants?: ExpenseParticipant[]): number => {
    return participants?.length || 0;
  };

  const getUserOwedAmount = (expense: Expense): number => {
    const participant = expense.participants?.find(
      (p) => p.user_id === currentUser?.user_id
    );
    return participant ? Number(participant.amount_owed || 0) : 0;
  };

  const getUserPaidAmount = (expense: Expense): number => {
    const payer = expense.payers.find((p) => p.user_id === currentUser?.user_id);
    return payer ? Number(payer.amount_paid) : 0;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#33306b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.toast,
            toastType === "success" ? styles.toastSuccess : styles.toastError,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
        >
          <Feather
            name={toastType === "success" ? "check-circle" : "alert-circle"}
            size={20}
            color="#fff"
            style={styles.toastIcon}
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Balance Summary Card */}
      <LinearGradient
        colors={["#33306b", "#4a3f8f"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.balanceHeader}>
          <View>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text
              style={[
                styles.balanceAmount,
                balance.netBalance >= 0 ? styles.positiveBalance : styles.negativeBalance,
              ]}
            >
              {balance.netBalance >= 0 ? "+" : ""}
              {formatCurrency(balance.netBalance, primaryCurrency)}
            </Text>
          </View>
          {balance.netBalance > 0 ? (
            <LottieView
              source={require("../../assets/animations/cash-in.json")}
              autoPlay
              loop={false}
              speed={1}
              style={styles.lottieAnimation}
            />
          ) : (
            <View style={styles.balanceIconContainer}>
              <Feather name="trending-up" size={32} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.balanceBreakdown}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>You owe</Text>
            <Text style={styles.balanceItemAmount}>
              {formatCurrency(balance.totalOwed, primaryCurrency)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>You're owed</Text>
            <Text style={[styles.balanceItemAmount, styles.owedToAmount]}>
              {formatCurrency(balance.totalOwedTo, primaryCurrency)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Expenses Section */}
      <View style={styles.expensesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          <Text style={styles.expenseCount}>{expenses.length} expenses</Text>
        </View>

        {expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="file-text" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No expenses yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start splitting bills with friends!
            </Text>
          </View>
        ) : (
          expenses.map((expense) => {
            const userOwed = getUserOwedAmount(expense);
            const userPaid = getUserPaidAmount(expense);
            const net = userPaid - userOwed;
            const isOwed = net > 0;
            const isOwing = net < 0;

            return (
              <TouchableOpacity
                key={expense.expense_id}
                style={styles.expenseCard}
                activeOpacity={0.7}
              >
                <View style={styles.expenseHeader}>
                  <View style={styles.expenseIconContainer}>
                    <Text
                      style={[
                        styles.expenseCurrencyIcon,
                        isOwed && styles.expenseCurrencyIconOwed,
                        isOwing && styles.expenseCurrencyIconOwing,
                      ]}
                    >
                      {getCurrencySymbol(expense.currency)}
                    </Text>
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseDescription} numberOfLines={1}>
                      {expense.description}
                    </Text>
                    <Text style={styles.expenseMeta}>
                      Paid by {getExpensePayerNames(expense.payers)} •{" "}
                      {getExpenseParticipantCount(expense.participants)} people
                    </Text>
                  </View>
                  <View style={styles.expenseAmountContainer}>
                    <Text style={styles.expenseAmount}>
                      {formatCurrency(expense.amount, expense.currency)}
                    </Text>
                    {isOwed && (
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>
                          +{formatCurrency(net, expense.currency)}
                        </Text>
                      </View>
                    )}
                    {isOwing && (
                      <View style={[styles.badgeContainer, styles.badgeOwing]}>
                        <Text style={[styles.badgeText, styles.badgeTextOwing]}>
                          {formatCurrency(Math.abs(net), expense.currency)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.expenseFooter}>
                  <Text style={styles.expenseDate}>
                    {expense.created_at 
                      ? new Date(expense.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Recently"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  toast: {
    position: "absolute",
    top: 100,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastSuccess: {
    backgroundColor: "#10b981",
  },
  toastError: {
    backgroundColor: "#ef4444",
  },
  toastIcon: {
    marginRight: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  balanceCard: {
    margin: 16,
    marginTop: 92,
    padding: 24,
    borderRadius: 20,
    shadowColor: "#33306b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  positiveBalance: {
    color: "#10b981",
  },
  negativeBalance: {
    color: "#ef4444",
  },
  balanceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  lottieAnimation: {
    width: 150,
    height: 150,
  },
  balanceBreakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  balanceItem: {
    flex: 1,
  },
  balanceItemLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
  },
  balanceItemAmount: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  owedToAmount: {
    color: "#10b981",
  },
  balanceDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 16,
  },
  expensesSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  expenseCount: {
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
  expenseCard: {
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
  expenseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  expenseIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  expenseCurrencyIcon: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
  },
  expenseCurrencyIconOwed: {
    color: "#10b981",
  },
  expenseCurrencyIconOwing: {
    color: "#ef4444",
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  expenseMeta: {
    fontSize: 13,
    color: "#6b7280",
  },
  expenseAmountContainer: {
    alignItems: "flex-end",
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  badgeContainer: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeOwing: {
    backgroundColor: "#fee2e2",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10b981",
  },
  badgeTextOwing: {
    color: "#ef4444",
  },
  expenseFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  expenseDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
