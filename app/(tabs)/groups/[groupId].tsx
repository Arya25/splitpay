import { useGroupStore } from "@/src/store/groupStore";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

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
    <View style={{ flex: 1, padding: 16, marginTop: 92 }}>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>{group.name}</Text>
      <Text>Members</Text>
      {group.members.map((member) => (
        <Text key={member.id}>• {member.name}</Text>
      ))}
    </View>
  );
}
