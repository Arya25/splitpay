import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ExpenseService } from "../../services/ExpenseService";
import { GroupService } from "../../services/GroupService";
import { UserService } from "../../services/UserService";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserStore } from "../../src/store/userStore";
import currencies from "../data/currencies.json";
import { Modal, TextInput } from "react-native";

export default function ProfileScreen() {
  const { currentUser, setCurrentUser } = useUserStore();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalExpenses: 0,
  });
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [upiInput, setUpiInput] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProfileData = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a timeout to ensure loading doesn't get stuck
      timeoutRef.current = setTimeout(() => {
        console.warn("Profile data loading timeout - setting loading to false");
        setLoading(false);
      }, 10000); // 10 second timeout
      
      // Fetch latest user data from database (includes default_currency, upi_id)
      // Use Promise.allSettled to handle individual errors gracefully
      const [dbUserResult, groupsResult, expensesResult] = await Promise.allSettled([
        UserService.getUserById(currentUser.user_id).catch(err => {
          console.error("Error fetching user:", err);
          return null;
        }),
        GroupService.getAllGroups(currentUser.user_id).catch(err => {
          console.error("Error fetching groups:", err);
          return [];
        }),
        ExpenseService.getUserExpenses(currentUser.user_id).catch(err => {
          console.error("Error fetching expenses:", err);
          return [];
        }),
      ]);

      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Update user store with latest data
      if (dbUserResult.status === 'fulfilled' && dbUserResult.value) {
        setCurrentUser(dbUserResult.value);
      }

      const groups = groupsResult.status === 'fulfilled' ? groupsResult.value : [];
      const expenses = expensesResult.status === 'fulfilled' ? expensesResult.value : [];

      setStats({
        totalGroups: Array.isArray(groups) ? groups.length : 0,
        totalExpenses: Array.isArray(expenses) ? expenses.length : 0,
      });
    } catch (error) {
      console.error("Error loading profile data:", error);
      // Set stats to 0 on error
      setStats({
        totalGroups: 0,
        totalExpenses: 0,
      });
    } finally {
      // Clear timeout in finally block
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoading(false);
    }
  }, [currentUser?.user_id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        loadProfileData();
        setUpiInput(currentUser.upi_id || "");
      } else {
        setLoading(false);
      }
    }, [loadProfileData, currentUser?.user_id])
  );

  const handleCurrencySelect = async (currencyCode: string) => {
    if (!currentUser) return;

    try {
      setUpdating(true);
      const updatedUser = await UserService.updateUser(currentUser.user_id, {
        default_currency: currencyCode,
      });
      setCurrentUser(updatedUser);
      setShowCurrencyModal(false);
    } catch (error) {
      console.error("Error updating currency:", error);
      Alert.alert("Error", "Failed to update currency. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleUPISave = async () => {
    if (!currentUser) return;

    // Basic UPI validation (format: xyz@paytm, xyz@upi, etc.)
    const upiPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (upiInput.trim() && !upiPattern.test(upiInput.trim())) {
      Alert.alert("Invalid UPI ID", "Please enter a valid UPI ID (e.g., yourname@paytm)");
      return;
    }

    try {
      setUpdating(true);
      const updatedUser = await UserService.updateUser(currentUser.user_id, {
        upi_id: upiInput.trim() || undefined,
      });
      setCurrentUser(updatedUser);
      setShowUPIModal(false);
    } catch (error) {
      console.error("Error updating UPI ID:", error);
      Alert.alert("Error", "Failed to update UPI ID. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const getCurrencySymbol = (code?: string) => {
    const defaultCode = code || "INR";
    const currency = currencies.find((c) => c.code === defaultCode);
    return currency?.symbol || "₹";
  };

  const getCurrencyName = (code?: string) => {
    const defaultCode = code || "INR";
    const currency = currencies.find((c) => c.code === defaultCode);
    return currency?.name || "Indian Rupee";
  };

  const getUserDefaultCurrency = () => {
    return currentUser?.default_currency || "INR";
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              useUserStore.getState().logout();
            } catch (error) {
              console.error("Error signing out:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (!currentUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#33306b" />
      </View>
    );
  }

  const userName = currentUser.user_name || "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const userEmail = currentUser.email || "No email";
  const userPhone = currentUser.phone || "No phone";

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={["#33306b", "#4a3f8f", "#5a4fa0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            {/* Profile Picture */}
            <View style={styles.profilePictureContainer}>
              {currentUser.profile_image_url && currentUser.profile_image_url.trim() !== "" ? (
                <Image
                  source={{ uri: currentUser.profile_image_url }}
                  style={styles.profilePicture}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <Text style={styles.profilePictureText}>{userInitial}</Text>
                </View>
              )}
              <View style={styles.profilePictureBorder} />
            </View>

            {/* User Info */}
            <Text style={styles.userName}>{userName}</Text>
            {userEmail !== "No email" && (
              <Text style={styles.userEmail}>{userEmail}</Text>
            )}
            {userPhone !== "No phone" && (
              <Text style={styles.userPhone}>{userPhone}</Text>
            )}
          </View>
        </LinearGradient>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Feather name="users" size={24} color="#33306b" />
              </View>
              <View style={styles.statContent}>
                {loading ? (
                  <ActivityIndicator size="small" color="#33306b" />
                ) : (
                  <>
                    <Text style={styles.statValue}>{stats.totalGroups}</Text>
                    <Text style={styles.statLabel}>Groups</Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Feather name="file-text" size={24} color="#33306b" />
              </View>
              <View style={styles.statContent}>
                {loading ? (
                  <ActivityIndicator size="small" color="#33306b" />
                ) : (
                  <>
                    <Text style={styles.statValue}>{stats.totalExpenses}</Text>
                    <Text style={styles.statLabel}>Expenses</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.infoCard}>
            {/* Default Currency */}
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => setShowCurrencyModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.infoRowLeft}>
                <View style={styles.currencyIconContainer}>
                  <Text style={styles.currencyIconText}>
                    {getCurrencySymbol(currentUser?.default_currency)}
                  </Text>
                </View>
                <Text style={styles.infoLabel}>Default Currency</Text>
              </View>
              <View style={styles.infoRowRight}>
                <Text style={styles.infoValue}>
                  {getCurrencySymbol(currentUser?.default_currency)}{" "}
                  {getUserDefaultCurrency()}
                </Text>
                <Feather name="chevron-right" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>

            <View style={styles.infoDivider} />

            {/* UPI ID */}
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => {
                setUpiInput(currentUser?.upi_id || "");
                setShowUPIModal(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.infoRowLeft}>
                <Feather name="credit-card" size={20} color="#6b7280" />
                <Text style={styles.infoLabel}>UPI ID</Text>
              </View>
              <View style={styles.infoRowRight}>
                <Text style={styles.infoValue}>
                  {currentUser?.upi_id || "Not set"}
                </Text>
                <Feather name="chevron-right" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={styles.actionButtonLeft}>
                <Feather name="log-out" size={20} color="#ef4444" />
                <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                  Sign Out
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Default Currency</Text>
              <TouchableOpacity
                onPress={() => setShowCurrencyModal(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.currencyOption,
                    getUserDefaultCurrency() === currency.code &&
                      styles.currencyOptionSelected,
                  ]}
                  onPress={() => handleCurrencySelect(currency.code)}
                >
                  <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyCode}>{currency.code}</Text>
                    <Text style={styles.currencyName}>{currency.name}</Text>
                  </View>
                  {getUserDefaultCurrency() === currency.code && (
                    <Feather name="check" size={20} color="#33306b" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* UPI ID Modal */}
      <Modal
        visible={showUPIModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUPIModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set UPI ID</Text>
              <TouchableOpacity
                onPress={() => setShowUPIModal(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Enter your UPI ID (e.g., yourname@paytm, yourname@upi)
              </Text>
              <TextInput
                style={styles.upiInput}
                value={upiInput}
                onChangeText={setUpiInput}
                placeholder="yourname@paytm"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowUPIModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleUPISave}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonTextSave}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: "center",
  },
  profilePictureContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  profilePictureText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#33306b",
  },
  profilePictureBorder: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  userName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
  },
  statsSection: {
    marginTop: -20,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statContent: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  currencyIconContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyIconText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
  },
  infoLabel: {
    fontSize: 16,
    color: "#4b5563",
    marginLeft: 12,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "600",
  },
  infoRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  currencyOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  currencyOptionSelected: {
    backgroundColor: "#f3f4f6",
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1f2937",
    width: 40,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 14,
    color: "#6b7280",
  },
  upiInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f3f4f6",
  },
  modalButtonSave: {
    backgroundColor: "#33306b",
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  actionsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  actionButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  actionButtonText: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
    marginLeft: 12,
  },
  actionButtonTextDanger: {
    color: "#ef4444",
  },
  bottomSpacing: {
    height: 32,
  },
});
