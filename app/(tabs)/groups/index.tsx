import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useGroupStore } from "../../../src/store/groupStore";

export default function GroupsScreen() {
  const { groups, loading, fetchGroups } = useGroupStore();

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, marginTop: 92 }}>
      {groups.map((group) => (
        <TouchableOpacity
          key={group.id}
          onPress={() => router.push(`/groups/${group.id}`)}
          style={{
            padding: 12,
            borderWidth: 1,
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 16 }}>{group.name}</Text>
          <Text>{group.members.length} members</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
