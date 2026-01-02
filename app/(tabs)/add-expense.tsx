import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import currencies from "../data/currencies.json";
import { Expense, ExpenseParticipant, ExpenseService, SplitType } from "../services/ExpenseService";
import { Group, GroupService } from "../services/GroupService";
import { User, UserService } from "../services/userService";
const AddExpensePage = () => {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [currency, setCurrency] = useState(currencies[0]);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [createdBy, setCreatedBy] = useState("user1"); // hardcoded for now

  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [participants, setParticipants] = useState<ExpenseParticipant[]>([]);
  const [search, setSearch] = useState("");
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  useEffect(() => {
    UserService.getAllUsers().then(setUsers);
    GroupService.getAllGroups().then(setGroups);
  }, []);

  useEffect(() => {
    const fetchParticipants = async () => {
      let allUsers: User[] = [...selectedUsers];
      for (const g of selectedGroups) {
        const members = await GroupService.getGroupMembers(g.group_id);
        allUsers.push(...members);
      }
      const uniqueUsersMap = new Map<string, User>();
      allUsers.forEach((u) => uniqueUsersMap.set(u.user_id, u));
      const uniqueUsers = Array.from(uniqueUsersMap.values());

      let newParticipants: ExpenseParticipant[] = uniqueUsers.map((u) => ({ user_id: u.user_id }));
      if (splitType === "equal" && uniqueUsers.length > 0 && amount) {
        const perUser = parseFloat(amount) / uniqueUsers.length;
        newParticipants = newParticipants.map((p) => ({ ...p, amount_owed: perUser }));
      }

      setParticipants(newParticipants);
    };

    fetchParticipants();
  }, [selectedUsers, selectedGroups, splitType, amount]);

  const addUser = (user: User) => {
    if (!selectedUsers.find((u) => u.user_id === user.user_id)) {
      setSelectedUsers([...selectedUsers, user]);
      setSearch("");
    }
  };

  const removeUser = (user_id: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.user_id !== user_id));
  };

  const toggleGroup = (group: Group) => {
    if (selectedGroups.some((g) => g.group_id === group.group_id)) {
      setSelectedGroups(selectedGroups.filter((g) => g.group_id !== group.group_id));
    } else {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  const handleAmountChange = (user_id: string, value: string) => {
    setParticipants(
      participants.map((p) =>
        p.user_id === user_id
          ? splitType === "percentage"
            ? { ...p, percentage: parseFloat(value) }
            : { ...p, amount_owed: parseFloat(value) }
          : p
      )
    );
  };

  const submitExpense = async () => {
    if (!amount || !desc || participants.length === 0) {
      Alert.alert("Please fill all fields and select participants");
      return;
    }

    const expense: Expense = {
      amount: parseFloat(amount),
      desc,
      currency: currency.code,
      created_by: createdBy,
      split_type: splitType,
      scopes: [
        ...selectedUsers.map((u) => ({ type: "user" as const, id: u.user_id })),
        ...selectedGroups.map((g) => ({ type: "group" as const, id: g.group_id })),
      ],
      participants,
      payers: [{ user_id: createdBy, amount_paid: parseFloat(amount) }],
    };

    await ExpenseService.addExpense(expense);
    Alert.alert("Expense added successfully!");
    // Reset form
    setAmount("");
    setDesc("");
    setSplitType("equal");
    setSelectedUsers([]);
    setSelectedGroups([]);
    setParticipants([]);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.user_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
  );

  return (
    <ScrollView style={styles.container}>
      {/* Share With */}
      <Text style={styles.label}>Share with</Text>
      <View style={styles.pillsContainer}>
        {selectedUsers.map((u) => (
          <View key={u.user_id} style={styles.pill}>
            <Text style={{ marginRight: 4 }}>{u.user_name}</Text>
            <TouchableOpacity onPress={() => removeUser(u.user_id)}>
              <Text>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <TextInput
        placeholder="Type name, email or phone"
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />
      {search.length > 0 && (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => addUser(item)} style={styles.userSuggestion}>
              <Text>{item.user_name} ({item.email})</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        placeholder="Lunch, Taxi, etc."
        value={desc}
        onChangeText={setDesc}
        style={styles.input}
      />

      {/* Amount with Currency */}
      <Text style={styles.label}>Amount</Text>
      <View style={styles.amountRow}>
        <TouchableOpacity
          style={styles.currencyButton}
          onPress={() => setCurrencyModalVisible(true)}
        >
          <Text>{currency.symbol}</Text>
        </TouchableOpacity>
        <TextInput
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={styles.amountInput}
        />
      </View>

      {/* Currency Picker Modal */}
      <Modal visible={currencyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <FlatList
              data={currencies}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setCurrency(item);
                    setCurrencyModalVisible(false);
                  }}
                  style={styles.currencyItem}
                >
                  <Text>{item.symbol} {item.code}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setCurrencyModalVisible(false)} style={styles.closeButton}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Split Type */}
      <Text style={styles.label}>Split Type</Text>
      <View style={styles.splitTypeRow}>
        {(["equal", "percentage", "share"] as SplitType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.splitTypeButton,
              splitType === type && styles.splitTypeButtonActive,
            ]}
            onPress={() => setSplitType(type)}
          >
            <Text
              style={[
                styles.splitTypeButtonText,
                splitType === type && styles.splitTypeButtonTextActive,
              ]}
            >
              {type.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Groups */}
      <Text style={styles.label}>Select Groups</Text>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.group_id}
        horizontal
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => toggleGroup(item)}
            style={[
              styles.selectButton,
              selectedGroups.some((g) => g.group_id === item.group_id) && styles.selectButtonActive,
            ]}
          >
            <Text>{item.group_name}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Participants */}
      <Text style={styles.label}>Participants</Text>
      {participants.map((p) => (
        <View key={p.user_id} style={styles.participantRow}>
          <Text style={styles.participantName}>
            {users.find((u) => u.user_id === p.user_id)?.user_name || p.user_id}
          </Text>
          {splitType === "equal" ? (
            <Text>{p.amount_owed?.toFixed(2)}</Text>
          ) : (
            <TextInput
              style={styles.participantInput}
              keyboardType="numeric"
              value={
                splitType === "percentage"
                  ? p.percentage?.toString()
                  : p.amount_owed?.toString()
              }
              onChangeText={(val) => handleAmountChange(p.user_id, val)}
            />
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.submitButton} onPress={submitExpense}>
        <Text style={styles.submitButtonText}>Add Expense</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AddExpensePage;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#E0F7FA",
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  userSuggestion: {
    padding: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    marginTop: 8,
  },
  currencyButton: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: "#ccc",
  },
  amountInput: {
    flex: 1,
    padding: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000099",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "80%",
    maxHeight: "60%",
    padding: 16,
  },
  currencyItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  closeButton: {
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  splitTypeRow: {
    flexDirection: "row",
    marginVertical: 12,
  },
  splitTypeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#999",
    marginRight: 10,
  },
  splitTypeButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  splitTypeButtonText: {
    color: "#000",
  },
  splitTypeButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  selectButton: {
    padding: 8,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  selectButtonActive: {
    backgroundColor: "#007AFF33",
    borderColor: "#007AFF",
  },
  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  participantName: {
    fontSize: 14,
    fontWeight: "500",
  },
  participantInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 6,
    width: 70,
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
