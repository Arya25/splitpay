import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
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
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserStore } from "../../src/store/userStore";

export default function ProfileScreen() {
  const { currentUser } = useUserStore();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalExpenses: 0,
    memberSince: "",
  });

  const loadProfileData = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [groups, expenses] = await Promise.all([
        GroupService.getAllGroups(currentUser.user_id),
        ExpenseService.getUserExpenses(currentUser.user_id),
      ]);

      const memberSinceDate = currentUser.member_since
        ? new Date(currentUser.member_since).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })
        : "";

      setStats({
        totalGroups: groups.length,
        totalExpenses: expenses.length,
        memberSince: memberSinceDate,
      });
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

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
              {currentUser.profile_image_url ? (
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
                <Feather name="dollar-sign" size={24} color="#33306b" />
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

        {/* Account Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Feather name="calendar" size={20} color="#6b7280" />
                <Text style={styles.infoLabel}>Member since</Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color="#33306b" />
              ) : (
                <Text style={styles.infoValue}>
                  {stats.memberSince || "N/A"}
                </Text>
              )}
            </View>
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
