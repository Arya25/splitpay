import { Feather } from "@expo/vector-icons";
import { Tabs, usePathname, router } from "expo-router";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const pathname = usePathname();
  
  // Helper to check if route is focused
  const isFocused = (routeName: string) =>
    state.routes[state.index].name === routeName;

  // Get current route name
  const currentRoute = state.routes[state.index].name;
  const isAddExpensePage = currentRoute === "add-expense";

  // Helper to get tab label
  const getTabLabel = (routeName: string) => {
    const labels: Record<string, string> = {
      index: "Home",
      groups: "Groups",
      activity: "Activity",
      profile: "Profile",
    };
    return labels[routeName] || routeName;
  };

  // Helper to handle groups navigation
  const handleGroupsNavigation = () => {
    // Check if we're on a groups sub-route (like create-group or [groupId])
    const isOnGroupsSubRoute = pathname?.startsWith("/groups/") && pathname !== "/groups" && pathname !== "/groups/";
    const isOnGroupsIndex = pathname === "/groups" || pathname === "/groups/";
    
    if (isOnGroupsSubRoute) {
      // If on a sub-route, navigate to groups index
      router.push("/groups");
    } else if (isOnGroupsIndex) {
      // If already on groups index, do nothing (no refresh)
      return;
    } else {
      // If on a different tab, navigate to groups
      navigation.navigate("groups");
    }
  };

  return (
    <View style={styles.tabBar}>
      {isAddExpensePage ? (
        // Evenly spaced layout when on add-expense page
        <>
          <TouchableOpacity
            style={styles.evenlySpacedIcon}
            onPress={() => navigation.navigate("index")}
          >
            <HomeIcon
              width={28}
              height={28}
              stroke={isFocused("index") ? "#000" : "#999"}
            />
            <Text
              style={[
                styles.tabLabel,
                isFocused("index") && styles.tabLabelActive,
              ]}
            >
              {getTabLabel("index")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.evenlySpacedIcon}
            onPress={handleGroupsNavigation}
          >
            <GroupsIcon
              width={28}
              height={28}
              stroke={isFocused("groups") ? "#000" : "#999"}
            />
            <Text
              style={[
                styles.tabLabel,
                isFocused("groups") && styles.tabLabelActive,
              ]}
            >
              {getTabLabel("groups")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.evenlySpacedIcon}
            onPress={() => navigation.navigate("activity")}
          >
            <ActivityIcon
              width={28}
              height={28}
              stroke={isFocused("activity") ? "#000" : "#999"}
            />
            <Text
              style={[
                styles.tabLabel,
                isFocused("activity") && styles.tabLabelActive,
              ]}
            >
              {getTabLabel("activity")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.evenlySpacedIcon}
            onPress={() => navigation.navigate("profile")}
          >
            <ProfileIcon
              width={28}
              height={28}
              stroke={isFocused("profile") ? "#000" : "#999"}
            />
            <Text
              style={[
                styles.tabLabel,
                isFocused("profile") && styles.tabLabelActive,
              ]}
            >
              {getTabLabel("profile")}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        // Original layout with plus button
        <>
          {/* Left Section */}
          <View style={styles.leftIcons}>
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => navigation.navigate("index")}
            >
              <HomeIcon
                width={28}
                height={28}
                stroke={isFocused("index") ? "#000" : "#999"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isFocused("index") && styles.tabLabelActive,
                ]}
              >
                {getTabLabel("index")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={handleGroupsNavigation}
            >
              <GroupsIcon
                width={28}
                height={28}
                stroke={isFocused("groups") ? "#000" : "#999"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isFocused("groups") && styles.tabLabelActive,
                ]}
              >
                {getTabLabel("groups")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Center Section (space for floating Add button) */}
          <View style={{ width: 70 }} />

          {/* Right Section */}
          <View style={styles.rightIcons}>
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => navigation.navigate("activity")}
            >
              <ActivityIcon
                width={28}
                height={28}
                stroke={isFocused("activity") ? "#000" : "#999"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isFocused("activity") && styles.tabLabelActive,
                ]}
              >
                {getTabLabel("activity")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => navigation.navigate("profile")}
            >
              <ProfileIcon
                width={28}
                height={28}
                stroke={isFocused("profile") ? "#000" : "#999"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isFocused("profile") && styles.tabLabelActive,
                ]}
              >
                {getTabLabel("profile")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Floating Add Button */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate("add-expense")}
            >
              <Feather name="plus" size={32} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    height: 80,
    backgroundColor: "#fff",
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  evenlySpacedIcon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
    marginTop: 2,
  },
  tabLabelActive: {
    color: "#000",
    fontWeight: "600",
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
    bottom: 40,
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
