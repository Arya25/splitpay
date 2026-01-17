import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Image } from "expo-image";
import { GroupService } from "../../../services/GroupService";
import { UserService } from "../../../services/UserService";
import { useUserStore } from "../../../src/store/userStore";
import { useGroupStore } from "../../../src/store/groupStore";
import { User } from "../../../src/types/models";

export default function CreateGroupScreen() {
  const { currentUser } = useUserStore();
  const { fetchGroups } = useGroupStore();
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    UserService.getAllUsers().then(setUsers);
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.user_id !== currentUser?.user_id &&
      (u.user_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search))
  );

  const addUser = (user: User) => {
    if (!selectedUsers.find((u) => u.user_id === user.user_id)) {
      setSelectedUsers([...selectedUsers, user]);
      setSearch("");
    }
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.user_id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!currentUser || !groupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    try {
      setSaving(true);

      const memberIds = [
        currentUser.user_id,
        ...selectedUsers.map((u) => u.user_id),
      ];

      await GroupService.createGroup(
        {
          group_name: groupName.trim(),
          group_icon: "",
          created_by: currentUser.user_id,
        },
        memberIds
      );

      // Refresh groups list
      await fetchGroups();

      // Navigate back
      router.back();
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Group Name */}
      <View style={styles.header}>
        <TextInput
          ref={inputRef}
          style={styles.groupNameInput}
          placeholder="Group name"
          placeholderTextColor="#9ca3af"
          value={groupName}
          onChangeText={setGroupName}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
      </View>

        {/* Members Section */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Add Members</Text>
          
          {/* Selected Members Pills */}
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.pillsContainer}>
              <View style={[styles.pill, styles.youPill]}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>Y</Text>
                  </View>
                </View>
                <Text style={styles.pillText}>You</Text>
              </View>

              {selectedUsers.map((user) => (
                <View key={user.user_id} style={styles.pill}>
                  <View style={styles.avatarContainer}>
                    {user.profile_image_url ? (
                      <Image
                        source={{ uri: user.profile_image_url }}
                        style={styles.avatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                          {user.user_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.pillText}>{user.user_name}</Text>
                  <TouchableOpacity
                    onPress={() => removeUser(user.user_id)}
                    style={styles.removeButton}
                  >
                    <Feather name="x" size={14} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Search Input */}
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Add people..."
                placeholderTextColor="#999"
                style={styles.inlineInput}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={() => inputRef.current?.blur()}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>

        {/* Search Suggestions */}
        {search.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {filteredUsers.length === 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No users found</Text>
              </View>
            ) : (
              filteredUsers.map((user) => (
                <TouchableOpacity
                  key={user.user_id}
                  style={styles.userSuggestion}
                  onPress={() => addUser(user)}
                >
                  {user.profile_image_url ? (
                    <Image
                      source={{ uri: user.profile_image_url }}
                      style={styles.suggestionAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.suggestionAvatarPlaceholder}>
                      <Text style={styles.suggestionAvatarText}>
                        {user.user_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.suggestionTextContainer}>
                    <Text style={styles.userName}>{user.user_name}</Text>
                    {user.email && (
                      <Text style={styles.userMeta}>{user.email}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Create Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              (!groupName.trim() || saving) && styles.createButtonDisabled,
            ]}
            disabled={!groupName.trim() || saving}
            onPress={handleCreateGroup}
          >
            <Text style={styles.createButtonText}>
              {saving ? "Creating..." : "Create Group"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 16,
    paddingTop: 100,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  groupNameInput: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    padding: 0,
    minHeight: 40,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F0FE",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    gap: 6,
  },
  youPill: {
    backgroundColor: "#D6ECFF",
  },
  avatarContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  removeButton: {
    marginLeft: 4,
    padding: 2,
  },
  inlineInput: {
    minWidth: 120,
    flexGrow: 1,
    fontSize: 16,
    padding: 0,
    color: "#333",
  },
  suggestionsContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    maxHeight: 300,
  },
  noResults: {
    padding: 20,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  userSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  suggestionAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  suggestionTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  userMeta: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  createButton: {
    backgroundColor: "#33306b",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  createButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
