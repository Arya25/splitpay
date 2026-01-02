import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import ActivityIcon from "../../assets/icons/activity.svg";
import GroupsIcon from "../../assets/icons/groups.svg";
import HomeIcon from "../../assets/icons/home.svg";
import ProfileIcon from "../../assets/icons/profile.svg";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarActiveTintColor: "red" }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

function CustomTabBar({ state, navigation }: any) {
  // Helper to check if route is focused
  const isFocused = (routeName: string) =>
    state.routes[state.index].name === routeName;

  return (
    <View style={styles.tabBar}>
      {/* Left Section */}
      <View style={styles.leftIcons}>
        <TouchableOpacity onPress={() => navigation.navigate("index")}>
          <HomeIcon
            width={28}
            height={28}
            stroke={isFocused("groups") ? "#000" : "#999"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("groups")}>
          <GroupsIcon
            width={28}
            height={28}
            stroke={isFocused("groups") ? "#000" : "#999"}
          />
        </TouchableOpacity>
      </View>

      {/* Center Section (space for floating Add button) */}
      <View style={{ width: 70 }} />

      {/* Right Section */}
      <View style={styles.rightIcons}>
        <TouchableOpacity onPress={() => navigation.navigate("activity")}>
          <ActivityIcon
            width={28}
            height={28}
            stroke={isFocused("activity") ? "#000" : "#999"}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("profile")}>
          <ProfileIcon
            width={28}
            height={28}
            stroke={isFocused("profile") ? "#000" : "#999"}
          />
        </TouchableOpacity>
      </View>

      {/* Floating Add Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => console.log("Add pressed")}
        >
          <Feather name="plus" size={32} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    height: 70,
    backgroundColor: "#fff",
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  leftIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 40, // space between Home and Groups
    justifyContent: "center",
    marginLeft: 10,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 40, // space between Activity and Profile
    justifyContent: "center",
    marginRight: 10,
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 35,
    left: width / 2,
    transform: [{ translateX: -35 }],
  },
  addButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#33306bff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 5,
    elevation: 5,
  },
});
