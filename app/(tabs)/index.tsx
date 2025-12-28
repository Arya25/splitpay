import { useEffect } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";
import { useGroupStore } from "../../src/store/groupStore";
import { useUserStore } from "../../src/store/userStore";

export default function HomeScreen() {
  const {
    currentUser,
    loading: userLoading,
    fetchCurrentUser,
  } = useUserStore();
  const { groups, loading: groupsLoading, fetchGroups } = useGroupStore();
  const { signOut } = useAuth();

  useEffect(() => {
    fetchCurrentUser();
    fetchGroups();
  }, [fetchCurrentUser, fetchGroups]);

  if (userLoading || groupsLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Sign Out Button */}
      <TouchableOpacity
        onPress={signOut}
        style={{
          backgroundColor: '#FF3B30',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 18, marginBottom: 8 }}>
        Hello {currentUser?.name}
      </Text>

      <Text style={{ fontSize: 16, marginBottom: 12 }}>Your groups</Text>

      {groups.map((group) => (
        <View
          key={group.id}
          style={{
            padding: 12,
            borderWidth: 1,
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>{group.name}</Text>
          <Text>{group.members.length} members</Text>
        </View>
      ))}
    </View>
  );
}
