import { View, Text, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useUserStore } from "../../src/store/userStore";
import { useGroupStore } from "../../src/store/groupStore";

export default function HomeScreen() {
  const {
    currentUser,
    loading: userLoading,
    fetchCurrentUser,
  } = useUserStore();
  const { groups, loading: groupsLoading, fetchGroups } = useGroupStore();

  useEffect(() => {
    fetchCurrentUser();
    fetchGroups();
  }, []);

  if (userLoading || groupsLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
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
          <Text>{group.name}</Text>
          <Text>{group.members.length} members</Text>
        </View>
      ))}
    </View>
  );
}
