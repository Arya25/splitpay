import { useGroupStore } from "@/src/store/groupStore";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { User } from "../../../src/types/models";
import { GroupService } from "../../../services/GroupService";

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { groups } = useGroupStore();
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const group = groups.find((g) => g.group_id === groupId);

  useEffect(() => {
    if (group) {
      GroupService.getGroupMembers(group.group_id).then((users) => {
        setMembers(users);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [group]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, marginTop: 92 }}>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>{group.group_name}</Text>
      <Text>Members</Text>
      {members.map((member) => (
        <Text key={member.user_id}>• {member.user_name}</Text>
      ))}
    </View>
  );
}
