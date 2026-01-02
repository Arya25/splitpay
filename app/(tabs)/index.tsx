import { Text, View } from "react-native";
import { useGroupStore } from "../../src/store/groupStore";
import { useUserStore } from "../../src/store/userStore";

export default function HomeScreen() {
  const { currentUser, loading: userLoading } = useUserStore();
  const { groups, loading: groupsLoading, fetchGroups } = useGroupStore();

  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        marginTop: 92,
      }}
    >
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
