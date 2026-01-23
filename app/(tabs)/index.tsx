import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { ExpenseService } from "../../services/ExpenseService";
import { UserService } from "../../services/UserService";
import { useUserStore } from "../../src/store/userStore";
import { User } from "../../src/types/models";
import { formatCurrency } from "../../src/utils/currency";

export default function HomeScreen() {
  const { currentUser } = useUserStore();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({
    totalOwed: 0,
    totalOwedTo: 0,
    netBalance: 0,
  });
  const [balancesByPerson, setBalancesByPerson] = useState<Array<{ user_id: string; amount: number; currency: string }>>([]);
  const [groupBalances, setGroupBalances] = useState<Array<{ 
    group_id: string; 
    group_name: string; 
    group_icon: string | null;
    netAmount: number; 
    currency: string;
    memberBalances: Array<{ user_id: string; amount: number }>;
  }>>([]);
  const [userMap, setUserMap] = useState<Record<string, User>>({});
  const [primaryCurrency, setPrimaryCurrency] = useState<string>("INR");
  const [simplifyExpenses, setSimplifyExpenses] = useState<boolean>(true);
  
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const toastOpacity = useState(new Animated.Value(0))[0];
  const toastTranslateY = useState(new Animated.Value(-50))[0];
  
  // Audio sound ref
  const soundRef = useRef<Audio.Sound | null>(null);
  const hasPlayedSoundRef = useRef<boolean>(false);

  const loadData = React.useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Load balance, balances by person, and group balances in parallel
      const [balanceData, balancesByPersonData, groupBalancesData, usersData] = await Promise.all([
        ExpenseService.calculateUserBalance(currentUser.user_id),
        ExpenseService.getUserBalancesByPerson(currentUser.user_id),
        ExpenseService.getUserGroupBalances(currentUser.user_id),
        UserService.getAllUsers(),
      ]);

      setBalance(balanceData);
      setBalancesByPerson(balancesByPersonData);
      setGroupBalances(groupBalancesData);

      // Calculate most common currency from balances
      if (balancesByPersonData.length > 0) {
        const currencyCounts: Record<string, number> = {};
        balancesByPersonData.forEach((balance) => {
          const curr = balance.currency || "INR";
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
  }, [currentUser]);

  // Load sound on mount
  useEffect(() => {
    const loadSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/cash-in.mp3")
        );
        soundRef.current = sound;
      } catch (error) {
        console.error("Error loading sound:", error);
      }
    };

    loadSound();

    // Cleanup on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Play sound when balance is positive and animation is shown
  useEffect(() => {
    const playSound = async () => {
      if (balance.netBalance > 0 && !loading && !hasPlayedSoundRef.current && soundRef.current) {
        try {
          // Reset sound to beginning and play
          await soundRef.current.setPositionAsync(0);
          await soundRef.current.playAsync();
          hasPlayedSoundRef.current = true; // Mark as played
        } catch (error) {
          console.error("Error playing sound:", error);
        }
      }
    };

    if (!loading) {
      playSound();
    }
  }, [balance.netBalance, loading]);

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

  // Refresh data when screen comes into focus (removed duplicate useEffect)
  useFocusEffect(
    React.useCallback(() => {
      if (currentUser) {
        hasPlayedSoundRef.current = false; // Reset sound flag when screen comes into focus
        loadData();
      }
    }, [currentUser, loadData])
  );

  // Show toast message if expense was saved
  useEffect(() => {
    if (params.expenseSaved === "true") {
      showToast("Expense created successfully! 🎉", "success");
    } else if (params.expenseError === "true") {
      showToast("Failed to save expense. Please try again.", "error");
    }
  }, [params.expenseSaved, params.expenseError]);


  // Calculate consolidated balances when simplify is enabled
  const consolidatedBalances = useMemo(() => {
    if (!simplifyExpenses) {
      return [];
    }

    // Map to store consolidated balances per person: { user_id: amount }
    const consolidatedMap: Record<string, number> = {};

    // Add individual balances
    balancesByPerson.forEach((balance) => {
      if (!consolidatedMap[balance.user_id]) {
        consolidatedMap[balance.user_id] = 0;
      }
      consolidatedMap[balance.user_id] += balance.amount;
    });

    // Add group member balances
    groupBalances.forEach((groupBalance) => {
      groupBalance.memberBalances.forEach((memberBalance) => {
        if (!consolidatedMap[memberBalance.user_id]) {
          consolidatedMap[memberBalance.user_id] = 0;
        }
        consolidatedMap[memberBalance.user_id] += memberBalance.amount;
      });
    });

    // Convert to array and filter out zero balances
    return Object.entries(consolidatedMap)
      .map(([user_id, amount]) => ({
        user_id,
        amount: Math.round(amount * 100) / 100,
        currency: primaryCurrency, // Use primary currency for consolidated view
      }))
      .filter((balance) => balance.amount !== 0)
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending
  }, [simplifyExpenses, balancesByPerson, groupBalances, primaryCurrency]);


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
              {balance.netBalance === 0 
                ? "-" 
                : `${balance.netBalance >= 0 ? "+" : ""}${formatCurrency(balance.netBalance, primaryCurrency)}`}
            </Text>
          </View>
          {balance.netBalance > 0 ? (
            <LottieView
              source={require("../../assets/animations/cash-in.json")}
              autoPlay
              loop={false}
              speed={1.5}
              style={styles.lottieAnimation}
            />
          ) : balance.netBalance < 0 ? (
            <LottieView
              source={require("../../assets/animations/cash-out.json")}
              autoPlay
              loop={true}
              speed={1.5}
              style={styles.lottieAnimationNegative}
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
              {balance.totalOwed === 0 ? "-" : formatCurrency(balance.totalOwed, primaryCurrency)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>You're owed</Text>
            <Text style={[styles.balanceItemAmount, styles.owedToAmount]}>
              {balance.totalOwedTo === 0 ? "-" : formatCurrency(balance.totalOwedTo, primaryCurrency)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Balances by Person Section */}
      <View style={styles.expensesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Who owes what</Text>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Simplify expenses</Text>
            <Switch
              value={simplifyExpenses}
              onValueChange={setSimplifyExpenses}
              trackColor={{ false: "#d1d5db", true: "#33306b" }}
              thumbColor={simplifyExpenses ? "#fff" : "#f3f4f6"}
            />
          </View>
        </View>

        {simplifyExpenses ? (
          // Simplified/Consolidated View
          consolidatedBalances.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="users" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No balances yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start splitting bills with friends!
              </Text>
            </View>
          ) : (
            consolidatedBalances.map((balanceItem) => {
              const user = userMap[balanceItem.user_id];
              const userName = user?.user_name || "Unknown";
              const isOwed = balanceItem.amount > 0; // Positive means they owe the user
              const isOwing = balanceItem.amount < 0; // Negative means user owes them

              return (
                <View
                  key={balanceItem.user_id}
                  style={styles.balanceCardItem}
                >
                  <View style={styles.balanceCardItemHeader}>
                    <View style={styles.balanceCardItemInfo}>
                      {user?.profile_image_url ? (
                        <Image
                          source={{ uri: user.profile_image_url }}
                          style={styles.balanceCardAvatar}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.balanceCardAvatarPlaceholder}>
                          <Text style={styles.balanceCardAvatarText}>
                            {userName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.balanceCardItemText}>
                        <Text style={styles.balanceCardItemName}>
                          {isOwed 
                            ? `${userName} owes you`
                            : `You owe ${userName}`
                          }
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.balanceCardItemAmount,
                        isOwed && styles.balanceCardItemAmountOwed,
                        isOwing && styles.balanceCardItemAmountOwing,
                      ]}
                    >
                      {formatCurrency(Math.abs(balanceItem.amount), balanceItem.currency)}
                    </Text>
                  </View>
                </View>
              );
            })
          )
        ) : balancesByPerson.length === 0 && groupBalances.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No balances yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start splitting bills with friends!
            </Text>
          </View>
        ) : (
          <>
            {balancesByPerson.length > 0 && balancesByPerson.map((balanceItem) => {
            const user = userMap[balanceItem.user_id];
            const userName = user?.user_name || "Unknown";
            const isOwed = balanceItem.amount > 0; // Positive means they owe the user
            const isOwing = balanceItem.amount < 0; // Negative means user owes them

            return (
              <View
                key={balanceItem.user_id}
                style={styles.balanceCardItem}
              >
                <View style={styles.balanceCardItemHeader}>
                  <View style={styles.balanceCardItemInfo}>
                    {user?.profile_image_url ? (
                      <Image
                        source={{ uri: user.profile_image_url }}
                        style={styles.balanceCardAvatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.balanceCardAvatarPlaceholder}>
                        <Text style={styles.balanceCardAvatarText}>
                          {userName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.balanceCardItemText}>
                      <Text style={styles.balanceCardItemName}>
                        {isOwed 
                          ? `${userName} owes you`
                          : `You owe ${userName}`
                        }
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.balanceCardItemAmount,
                      isOwed && styles.balanceCardItemAmountOwed,
                      isOwing && styles.balanceCardItemAmountOwing,
                    ]}
                  >
                    {formatCurrency(Math.abs(balanceItem.amount), balanceItem.currency)}
                  </Text>
                </View>
              </View>
            );
            })}

            {/* Group Balances Section */}
            {groupBalances.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: balancesByPerson.length > 0 ? 24 : 0 }]}>
                  <Text style={styles.sectionTitle}>Group Balances</Text>
                </View>
                {groupBalances.map((groupBalance) => {
              const isOwed = groupBalance.netAmount > 0;
              const isOwing = groupBalance.netAmount < 0;

              return (
                <View
                  key={groupBalance.group_id}
                  style={styles.groupBalanceCard}
                >
                  <View style={styles.groupBalanceHeader}>
                    <View style={styles.groupBalanceInfo}>
                      {groupBalance.group_icon ? (
                        <Image
                          source={{ uri: groupBalance.group_icon }}
                          style={styles.groupBalanceAvatar}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.groupBalanceAvatarPlaceholder}>
                          <Text style={styles.groupBalanceAvatarText}>
                            {groupBalance.group_name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.groupBalanceText}>
                        <Text style={styles.groupBalanceName}>
                          {groupBalance.group_name}
                        </Text>
                        <Text style={styles.groupBalanceSubtext}>
                          {groupBalance.memberBalances.length} {groupBalance.memberBalances.length === 1 ? 'person' : 'people'} involved
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.groupBalanceNetAmount,
                        isOwed && styles.groupBalanceNetAmountOwed,
                        isOwing && styles.groupBalanceNetAmountOwing,
                      ]}
                    >
                      {isOwed ? "+" : ""}
                      {formatCurrency(Math.abs(groupBalance.netAmount), groupBalance.currency)}
                    </Text>
                  </View>

                  {/* Member Balances Breakdown */}
                  {groupBalance.memberBalances.length > 0 && (
                    <View style={styles.groupMemberBalances}>
                      {groupBalance.memberBalances.map((memberBalance) => {
                        const member = userMap[memberBalance.user_id];
                        const memberName = member?.user_name || "Unknown";
                        const memberIsOwed = memberBalance.amount > 0;
                        const memberIsOwing = memberBalance.amount < 0;

                        return (
                          <View key={memberBalance.user_id} style={styles.groupMemberBalanceItem}>
                            <View style={styles.groupMemberBalanceInfo}>
                              {member?.profile_image_url ? (
                                <Image
                                  source={{ uri: member.profile_image_url }}
                                  style={styles.groupMemberAvatar}
                                  contentFit="cover"
                                />
                              ) : (
                                <View style={styles.groupMemberAvatarPlaceholder}>
                                  <Text style={styles.groupMemberAvatarText}>
                                    {memberName.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              <Text style={styles.groupMemberBalanceName}>
                                {memberIsOwed 
                                  ? `${memberName} owes you`
                                  : `You owe ${memberName}`
                                }
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.groupMemberBalanceAmount,
                                memberIsOwed && styles.groupMemberBalanceAmountOwed,
                                memberIsOwing && styles.groupMemberBalanceAmountOwing,
                              ]}
                            >
                              {formatCurrency(Math.abs(memberBalance.amount), groupBalance.currency)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
              </>
            )}
          </>
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
    marginBottom: 4,
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
  lottieAnimationNegative: {
    width: 180,
    height: 180,
  },
  balanceBreakdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
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
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
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
  balanceCardItem: {
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
  balanceCardItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceCardItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  balanceCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  balanceCardAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  balanceCardAvatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  balanceCardItemText: {
    flex: 1,
  },
  balanceCardItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  balanceCardItemAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  balanceCardItemAmountOwed: {
    color: "#10b981",
  },
  balanceCardItemAmountOwing: {
    color: "#ef4444",
  },
  groupBalanceCard: {
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
  groupBalanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  groupBalanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  groupBalanceAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  groupBalanceAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  groupBalanceAvatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  groupBalanceText: {
    flex: 1,
  },
  groupBalanceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  groupBalanceSubtext: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  groupBalanceNetAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  groupBalanceNetAmountOwed: {
    color: "#10b981",
  },
  groupBalanceNetAmountOwing: {
    color: "#ef4444",
  },
  groupMemberBalances: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 8,
  },
  groupMemberBalanceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  groupMemberBalanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  groupMemberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  groupMemberAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  groupMemberAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  groupMemberBalanceName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
  },
  groupMemberBalanceAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  groupMemberBalanceAmountOwed: {
    color: "#10b981",
  },
  groupMemberBalanceAmountOwing: {
    color: "#ef4444",
  },
});
