import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useGroupStore } from "../../../src/store/groupStore";
import { Group, User } from "../../../src/types/models";
import { GroupService } from "../../../services/GroupService";
import { UserService } from "../../../services/UserService";
import { useUserStore } from "../../../src/store/userStore";

export default function GroupsScreen() {
  const { groups, loading, fetchGroups } = useGroupStore();
  const { currentUser } = useUserStore();
  const [groupsWithMembers, setGroupsWithMembers] = useState<
    Array<Group & { membersData: User[] }>
  >([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Refresh data when screen comes into focus - fetch groups and members
  useFocusEffect(
    React.useCallback(() => {
      const loadGroupsWithMembers = async () => {
        if (!currentUser) return;
        
        setLoadingMembers(true);
        try {
          // Fetch groups with members (makes 2 queries to group_members:
          // 1. Get groups user belongs to, 2. Get all members for those groups)
          const groupsData = await GroupService.getAllGroupsWithMembers(currentUser.user_id);
          setGroupsWithMembers(groupsData);
        } catch (error) {
          console.error("Error loading groups with members:", error);
        } finally {
          setLoadingMembers(false);
        }
      };

      loadGroupsWithMembers();
    }, [currentUser])
  );

  if (loading || loadingMembers) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#33306b" />
      </View>
    );
  }

  // Filter groups based on search query
  const filteredGroups = groupsWithMembers.filter((group) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const groupNameMatch = group.group_name.toLowerCase().includes(query);
    const memberNameMatch = group.membersData.some((member) =>
      member.user_name.toLowerCase().includes(query)
    );
    
    return groupNameMatch || memberNameMatch;
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Groups</Text>
            <Text style={styles.headerSubtitle}>
              {filteredGroups.length} {filteredGroups.length === 1 ? "group" : "groups"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/groups/create-group")}
            activeOpacity={0.7}
          >
            <Text style={styles.createButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups or members..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.searchClearButton}
            >
              <Feather name="x" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="users" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>No groups yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Create a group to start splitting expenses with friends!
          </Text>
        </View>
      ) : filteredGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="search" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>No groups found</Text>
          <Text style={styles.emptyStateSubtext}>
            Try a different search term
          </Text>
        </View>
      ) : (
        <View style={styles.groupsList}>
          {filteredGroups.map((group) => {
            const memberCount = group.membersData.length;
            const displayMembers = group.membersData.slice(0, 4);
            const remainingCount = memberCount - displayMembers.length;

            return (
              <TouchableOpacity
                key={group.group_id}
                style={styles.groupCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/groups/${group.group_id}`)}
              >
                <View style={styles.groupHeader}>
                  <View style={styles.groupIconContainer}>
                    {group.group_icon ? (
                      <Image
                        source={{ uri: group.group_icon }}
                        style={styles.groupIcon}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.groupIconPlaceholder}>
                        <Text style={styles.groupIconText}>
                          {group.group_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.group_name}</Text>
                    <View style={styles.groupMeta}>
                      <Feather name="users" size={12} color="#6b7280" />
                      <Text style={styles.memberCount}>
                        {memberCount} {memberCount === 1 ? "member" : "members"}
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={20} color="#9ca3af" />
                </View>

                {memberCount > 0 && (
                  <View style={styles.membersSection}>
                    <View style={styles.membersAvatars}>
                      {displayMembers.map((member, index) => (
                        <View
                          key={member.user_id}
                          style={[
                            styles.memberAvatarContainer,
                            index > 0 && styles.memberAvatarOverlap,
                          ]}
                        >
                          {member.profile_image_url ? (
                            <Image
                              source={{ uri: member.profile_image_url }}
                              style={styles.memberAvatar}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.memberAvatarPlaceholder}>
                              <Text style={styles.memberAvatarText}>
                                {member.user_name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                      {remainingCount > 0 && (
                        <View
                          style={[
                            styles.memberAvatarContainer,
                            styles.memberAvatarOverlap,
                            styles.memberAvatarMore,
                          ]}
                        >
                          <Text style={styles.memberAvatarMoreText}>
                            +{remainingCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.membersList}>
                      {displayMembers.map((member) => (
                        <View key={member.user_id} style={styles.memberItem}>
                          <Text style={styles.memberName}>
                            {member.user_id === currentUser?.user_id
                              ? "You"
                              : member.user_name}
                          </Text>
                        </View>
                      ))}
                      {remainingCount > 0 && (
                        <Text style={styles.memberMore}>
                          and {remainingCount} more
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
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
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#33306b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  searchContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
    padding: 0,
  },
  searchClearButton: {
    padding: 4,
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
  groupsList: {
    padding: 16,
  },
  groupCard: {
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
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  groupIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    marginRight: 12,
  },
  groupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  groupIconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
  },
  groupIconText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberCount: {
    fontSize: 13,
    color: "#6b7280",
  },
  membersSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  membersAvatars: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  memberAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
  },
  memberAvatarOverlap: {
    marginLeft: -8,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  memberAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  memberAvatarMore: {
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarMoreText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },
  membersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  memberItem: {
    marginRight: 4,
  },
  memberName: {
    fontSize: 13,
    color: "#6b7280",
  },
  memberMore: {
    fontSize: 13,
    color: "#9ca3af",
    fontStyle: "italic",
  },
});
