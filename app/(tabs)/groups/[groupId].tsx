import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useGroupStore } from "@/src/store/groupStore";

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { groups } = useGroupStore();

  const group = groups.find((g) => g.id === groupId);

  if (!group) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>{group.name}</Text>
      <Text>Members</Text>
      {group.members.map((member) => (
        <Text key={member.id}>• {member.name}</Text>
      ))}
    </View>
  );
}
