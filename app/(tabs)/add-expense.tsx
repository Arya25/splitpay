import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Group, GroupService } from "../../services/GroupService";
import { User, UserService } from "../../services/UserService";
import currencies from "../data/currencies.json";

type Payer = User | "You";
type SelectedItem =
  | { type: "user"; data: User }
  | { type: "group"; data: Group };

const AddExpensePage = () => {
  const inputRef = useRef<TextInput>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    UserService.getAllUsers().then(setUsers);
    GroupService.getAllGroups().then(setGroups);

    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const addUser = (user: User) => {
    if (
      !selectedItems.find(
        (i) => i.type === "user" && i.data.user_id === user.user_id
      )
    ) {
      setSelectedItems([...selectedItems, { type: "user", data: user }]);
      setSearch("");
    }
  };

  const addGroup = (group: Group) => {
    if (
      !selectedItems.find(
        (i) => i.type === "group" && i.data.group_id === group.group_id
      )
    ) {
      setSelectedItems([...selectedItems, { type: "group", data: group }]);
      setSearch("");
    }
  };

  const removeItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: any) => {
    const key = e?.nativeEvent?.key;
    if (key === "Backspace" && search.length === 0) {
      if (selectedItems.length > 0) {
        setSelectedItems((prev) => prev.slice(0, -1));
      }
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.user_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
  );

  const filteredGroups = groups.filter((g) =>
    g.group_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
        <View style={styles.shareHeader}>
          <View style={styles.inlineRow}>
            <Text style={styles.headerText}>Sharing with</Text>

            <View style={[styles.pill, styles.youPill]}>
              <Text style={styles.pillText}>You</Text>
            </View>

            {selectedItems.map((item, index) => (
              <View
                key={`${item.type}-${index}`}
                style={[styles.pill, item.type === "group" && styles.groupPill]}
              >
                <Text style={styles.pillText}>
                  {item.type === "user"
                    ? item.data.user_name
                    : item.data.group_name}
                </Text>
                <TouchableOpacity onPress={() => removeItem(index)}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TextInput
              ref={inputRef}
              value={search}
              onChangeText={setSearch}
              placeholder=""
              style={styles.inlineInput}
              autoCorrect={false}
              autoCapitalize="none"
              onKeyPress={handleKeyPress}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* <ExpenseInputHorizontal
        users={users}
        onPayerSelect={(user) => console.log("Selected payer:", user)}
      /> */}

      {search.length > 0 && (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={[
            ...filteredGroups.map((g) => ({ type: "group" as const, g })),
            ...filteredUsers.map((u) => ({ type: "user" as const, u })),
          ]}
          keyExtractor={(item) =>
            item.type === "group" ? item.g.group_id : item.u.user_id
          }
          renderItem={({ item }) => {
            if (item.type === "group") {
              return (
                <TouchableOpacity
                  style={styles.userSuggestion}
                  onPress={() => addGroup(item.g)}
                >
                  <Text style={styles.userName}>{item.g.group_name}</Text>
                  <Text style={styles.userMeta}>Group</Text>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                style={styles.userSuggestion}
                onPress={() => addUser(item.u)}
              >
                <Text style={styles.userName}>{item.u.user_name}</Text>
                {item.u.email && (
                  <Text style={styles.userMeta}>{item.u.email}</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <ExpenseInputHorizontal
        users={users}
        onPayerSelect={(user) => console.log("Selected payer:", user)}
      />
    </SafeAreaView>
  );
};

const ExpenseInputHorizontal = ({
  users,
  onPayerSelect,
}: {
  users: User[];
  onPayerSelect?: (user: User) => void;
}) => {
  const [payer, setPayer] = useState<Payer>("You");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(currencies[0]);
  const [description, setDescription] = useState("");

  const amountRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);

  return (
    <View style={styles.expenseRow}>
      {/* Who paid */}
      <TouchableOpacity
        style={[styles.pill, payer !== "You" && styles.userPill]}
        onPress={() => {
          if (onPayerSelect && payer !== "You") onPayerSelect(payer as User);
          Keyboard.dismiss();
        }}
      >
        <Text style={styles.pillText}>
          {payer === "You" ? "You" : (payer as User).user_name}
        </Text>
      </TouchableOpacity>

      <Text style={styles.staticText}>paid</Text>

      {/* Amount */}
      <View style={styles.amountContainer}>
        <Text style={styles.currency}>{currency.symbol}</Text>
        <TextInput
          ref={amountRef}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
          style={styles.amountInput}
        />
      </View>

      <Text style={styles.staticText}>for</Text>

      {/* Description */}
      <TextInput
        ref={descRef}
        value={description}
        onChangeText={setDescription}
        placeholder="What was this for?"
        placeholderTextColor="#999"
        style={styles.descriptionInput}
        onSubmitEditing={() => Keyboard.dismiss()}
      />
    </View>
  );
};

export default AddExpensePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#ffffffff",
  },
  shareHeader: {
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  inlineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  inlineInput: {
    minWidth: 60,
    flexGrow: 1,
    fontSize: 16,
    padding: 0,
    marginLeft: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F0FE",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  groupPill: {
    backgroundColor: "#F1E8FF",
  },
  youPill: {
    backgroundColor: "#D6ECFF",
  },
  pillText: {
    fontSize: 14,
    marginRight: 6,
  },
  removeText: {
    fontSize: 14,
    color: "#555",
  },
  userSuggestion: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  userName: {
    fontSize: 15,
    fontWeight: "500",
  },
  userMeta: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  expenseRow: {
    flexDirection: "column",
    alignItems: "center",
    marginVertical: 20,
    flexWrap: "wrap",
  },
  userPill: {
    backgroundColor: "#E8F0FE",
  },
  staticText: {
    fontSize: 16,
    color: "#555",
    marginRight: 6,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginRight: 6,
  },
  currency: {
    fontSize: 18,
    fontWeight: "500",
    marginRight: 2,
  },
  amountInput: {
    fontSize: 20,
    fontWeight: "600",
    minWidth: 80,
  },
  descriptionInput: {
    fontSize: 16,
    minWidth: 100,
    flexGrow: 1,
  },
});
