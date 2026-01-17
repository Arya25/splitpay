import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { Group, SplitType, ExpenseScope, ExpenseParticipant, ExpensePayer } from "../../src/types/models";
import { User } from "../../src/types/models";
import { GroupService } from "../../services/GroupService";
import { UserService } from "../../services/UserService";
import { ExpenseService } from "../../services/ExpenseService";
import { useUserStore } from "../../src/store/userStore";
import { router } from "expo-router";
import currencies from "../data/currencies.json";

type Payer = User | "You";
type SelectedItem =
  | { type: "user"; data: User }
  | { type: "group"; data: Group };

const AddExpensePage = () => {
  const inputRef = useRef<TextInput>(null);
  const { currentUser } = useUserStore();

  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [search, setSearch] = useState("");
  
  // Expense form state (lifted from ExpenseInputHorizontal)
  const [payer, setPayer] = useState<Payer>("You");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(currencies[0]);
  const [description, setDescription] = useState("");
  
  // Split configuration state (lifted from SplitConfiguration)
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [splitParticipants, setSplitParticipants] = useState<User[]>([]);
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});
  
  // Loading state
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    UserService.getAllUsers().then(setUsers);
    
    // Fetch groups for current user
    if (currentUser) {
      GroupService.getAllGroups(currentUser.user_id).then(setGroups);
    }

    setTimeout(() => inputRef.current?.focus(), 200);
  }, [currentUser]);

  // Get all individual participants (expand groups to members)
  const getAllParticipants = async (): Promise<User[]> => {
    const participants: User[] = [];
    const participantIds = new Set<string>();

    // Add current user (You)
    if (currentUser) {
      participants.push(currentUser);
      participantIds.add(currentUser.user_id);
    }

    // Add selected users and expand groups
    for (const item of selectedItems) {
      if (item.type === "user") {
        if (!participantIds.has(item.data.user_id)) {
          participants.push(item.data);
          participantIds.add(item.data.user_id);
        }
      } else if (item.type === "group") {
        const groupMembers = await GroupService.getGroupMembers(
          item.data.group_id
        );
        for (const member of groupMembers) {
          if (!participantIds.has(member.user_id)) {
            participants.push(member);
            participantIds.add(member.user_id);
          }
        }
      }
    }

    return participants;
  };

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

  const handleSaveExpense = async () => {
    if (!currentUser || !amount || selectedItems.length === 0) {
      return;
    }

    // Validate split configuration
    if (splitType === "percentage") {
      const totalPercentage = Object.values(percentages).reduce(
        (sum, pct) => sum + (parseFloat(pct) || 0),
        0
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        alert("Total percentage must equal 100%");
        return;
      }
    }

    if (splitType === "share") {
      const totalAmount = parseFloat(amount);
      const totalShare = Object.values(shares).reduce(
        (sum, share) => sum + (parseFloat(share) || 0),
        0
      );
      if (Math.abs(totalShare - totalAmount) > 0.01) {
        alert(`Total share must equal amount (${currency.symbol}${totalAmount.toFixed(2)})`);
        return;
      }
    }

    try {
      setSaving(true);

      // Ensure we have participants loaded
      if (splitParticipants.length === 0) {
        const allParticipants = await getAllParticipants();
        setSplitParticipants(allParticipants);
        
        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Use current participants or reload if empty
      const participantsToUse = splitParticipants.length > 0 
        ? splitParticipants 
        : await getAllParticipants();

      // Build scopes from selectedItems
      const scopes: ExpenseScope[] = selectedItems.map((item) => ({
        type: item.type === "group" ? "group" : "user",
        id: item.type === "group" ? item.data.group_id : item.data.user_id,
      }));

      // Calculate participant amounts based on split type
      const totalAmount = parseFloat(amount);
      const participants: ExpenseParticipant[] = participantsToUse.map((participant) => {
        let amountOwed = 0;
        let percentage: number | undefined = undefined;

        if (splitType === "equal") {
          amountOwed = totalAmount / participantsToUse.length;
        } else if (splitType === "percentage") {
          const pct = parseFloat(percentages[participant.user_id] || "0");
          percentage = pct;
          amountOwed = (totalAmount * pct) / 100;
        } else if (splitType === "share") {
          amountOwed = parseFloat(shares[participant.user_id] || "0");
        }

        return {
          user_id: participant.user_id,
          amount_owed: Math.round(amountOwed * 100) / 100,
          percentage: percentage,
        };
      });

      // Build payers array
      const payers: ExpensePayer[] = [];
      if (payer === "You" && currentUser) {
        payers.push({
          user_id: currentUser.user_id,
          amount_paid: totalAmount,
        });
      } else if (payer !== "You") {
        payers.push({
          user_id: (payer as User).user_id,
          amount_paid: totalAmount,
        });
      }

      // Create expense object
      const expense = {
        amount: totalAmount,
        description: description || "Expense",
        currency: currency.code,
        created_by: currentUser.user_id,
        split_type: splitType,
        scopes: scopes,
        participants: participants,
        payers: payers,
      };

      // Save to database
      await ExpenseService.addExpense(expense);

      // Navigate back to home with success message
      router.replace({
        pathname: "/(tabs)/",
        params: { expenseSaved: "true" },
      });
    } catch (error) {
      console.error("Error saving expense:", error);
      
      // Navigate back with error message
      router.replace({
        pathname: "/(tabs)/",
        params: { expenseError: "true" },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {/* Header Section - Sharing with pills */}
        <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
          <View style={styles.shareHeader}>
            <Text style={styles.headerText}>Sharing with</Text>
            <View style={styles.pillsContainer}>
              <View style={[styles.pill, styles.youPill]}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>Y</Text>
                  </View>
                </View>
                <Text style={styles.pillText}>You</Text>
              </View>

              {selectedItems.map((item, index) => (
                <View
                  key={`${item.type}-${index}`}
                  style={[
                    styles.pill,
                    item.type === "group" && styles.groupPill,
                    item.type === "user" && styles.userPill,
                  ]}
                >
                  <View style={styles.avatarContainer}>
                    {item.type === "user" && item.data.profile_image_url ? (
                      <Image
                        source={{ uri: item.data.profile_image_url }}
                        style={styles.avatar}
                        contentFit="cover"
                      />
                    ) : item.type === "group" && item.data.group_icon ? (
                      <Image
                        source={{ uri: item.data.group_icon }}
                        style={styles.avatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                          {item.type === "user"
                            ? item.data.user_name.charAt(0).toUpperCase()
                            : item.data.group_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.pillText}>
                    {item.type === "user"
                      ? item.data.user_name
                      : item.data.group_name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeItem(index)}
                    style={styles.removeButton}
                  >
                    <Feather name="x" size={14} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}

              <TextInput
                ref={inputRef}
                value={search}
                onChangeText={setSearch}
                placeholder="Add people or groups..."
                placeholderTextColor="#999"
                style={styles.inlineInput}
                autoCorrect={false}
                autoCapitalize="none"
                onKeyPress={handleKeyPress}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>

        {/* Search Suggestions */}
        {search.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {[
              ...filteredGroups.map((g) => ({ type: "group" as const, g })),
              ...filteredUsers.map((u) => ({ type: "user" as const, u })),
            ].map((item) => {
              if (item.type === "group") {
                return (
                  <TouchableOpacity
                    key={item.g.group_id}
                    style={styles.userSuggestion}
                    onPress={() => addGroup(item.g)}
                  >
                    {item.g.group_icon ? (
                      <Image
                        source={{ uri: item.g.group_icon }}
                        style={styles.suggestionAvatar}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.suggestionAvatarPlaceholder}>
                        <Text style={styles.suggestionAvatarText}>
                          {item.g.group_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.suggestionTextContainer}>
                      <Text style={styles.userName}>{item.g.group_name}</Text>
                      <Text style={styles.userMeta}>Group</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={item.u.user_id}
                  style={styles.userSuggestion}
                  onPress={() => addUser(item.u)}
                >
                  {item.u.profile_image_url ? (
                    <Image
                      source={{ uri: item.u.profile_image_url }}
                      style={styles.suggestionAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.suggestionAvatarPlaceholder}>
                      <Text style={styles.suggestionAvatarText}>
                        {item.u.user_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.suggestionTextContainer}>
                    <Text style={styles.userName}>{item.u.user_name}</Text>
                    {item.u.email && (
                      <Text style={styles.userMeta}>{item.u.email}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Expense Details Card */}
        <View style={styles.expenseCard}>
          <ExpenseInputHorizontal
            users={users}
            selectedItems={selectedItems}
            currentUser={currentUser}
            payer={payer}
            setPayer={setPayer}
            amount={amount}
            setAmount={setAmount}
            currency={currency}
            setCurrency={setCurrency}
            description={description}
            setDescription={setDescription}
            splitType={splitType}
            setSplitType={setSplitType}
            splitParticipants={splitParticipants}
            setSplitParticipants={setSplitParticipants}
            percentages={percentages}
            setPercentages={setPercentages}
            shares={shares}
            setShares={setShares}
            onSave={handleSaveExpense}
            saving={saving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Split Configuration Component
const SplitConfiguration = ({
  selectedItems,
  amount,
  currency,
  currentUser,
  splitType,
  setSplitType,
  splitParticipants,
  setSplitParticipants,
  percentages,
  setPercentages,
  shares,
  setShares,
}: {
  selectedItems: SelectedItem[];
  amount: string;
  currency: { code: string; symbol: string; name: string };
  currentUser: User | null;
  splitType: SplitType;
  setSplitType: (type: SplitType) => void;
  splitParticipants: User[];
  setSplitParticipants: (participants: User[]) => void;
  percentages: Record<string, string>;
  setPercentages: (percentages: Record<string, string>) => void;
  shares: Record<string, string>;
  setShares: (shares: Record<string, string>) => void;
}) => {

  useEffect(() => {
    const loadParticipants = async () => {
      const allParticipants: User[] = [];
      const participantIds = new Set<string>();

      // Add current user (You)
      if (currentUser) {
        allParticipants.push(currentUser);
        participantIds.add(currentUser.user_id);
      }

      // Add selected users and expand groups
      for (const item of selectedItems) {
        if (item.type === "user") {
          if (!participantIds.has(item.data.user_id)) {
            allParticipants.push(item.data);
            participantIds.add(item.data.user_id);
          }
        } else if (item.type === "group") {
          const groupMembers = await GroupService.getGroupMembers(
            item.data.group_id
          );
          for (const member of groupMembers) {
            if (!participantIds.has(member.user_id)) {
              allParticipants.push(member);
              participantIds.add(member.user_id);
            }
          }
        }
      }

      setSplitParticipants(allParticipants);
      // Reset percentages and shares when participants change
      setPercentages({});
      setShares({});
    };

    loadParticipants();
  }, [selectedItems, currentUser, setSplitParticipants, setPercentages, setShares]);

  const totalAmount = parseFloat(amount) || 0;
  const equalAmount =
    splitParticipants.length > 0
      ? (totalAmount / splitParticipants.length).toFixed(2)
      : "0.00";

  // Calculate total percentage
  const totalPercentage = Object.values(percentages).reduce(
    (sum, pct) => sum + (parseFloat(pct) || 0),
    0
  );

  // Calculate total share
  const totalShare = Object.values(shares).reduce(
    (sum, share) => sum + (parseFloat(share) || 0),
    0
  );

  const updatePercentage = (userId: string, value: string) => {
    setPercentages((prev) => ({ ...prev, [userId]: value }));
  };

  const updateShare = (userId: string, value: string) => {
    setShares((prev) => ({ ...prev, [userId]: value }));
  };

  const getParticipantAmount = (userId: string): string => {
    if (splitType === "equal") {
      return equalAmount;
    } else if (splitType === "percentage") {
      const pct = parseFloat(percentages[userId] || "0");
      return ((totalAmount * pct) / 100).toFixed(2);
    } else if (splitType === "share") {
      return shares[userId] || "0.00";
    }
    return "0.00";
  };

  if (splitParticipants.length === 0) {
    return null;
  }

  return (
    <View>
      <Text style={styles.sectionLabel}>Split Details</Text>

      {/* Split Type Tabs */}
      <View style={styles.splitTabs}>
        <TouchableOpacity
          style={[
            styles.splitTab,
            splitType === "equal" && styles.splitTabActive,
          ]}
          onPress={() => setSplitType("equal")}
        >
          <Text
            style={[
              styles.splitTabText,
              splitType === "equal" && styles.splitTabTextActive,
            ]}
          >
            Equal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.splitTab,
            splitType === "percentage" && styles.splitTabActive,
          ]}
          onPress={() => setSplitType("percentage")}
        >
          <Text
            style={[
              styles.splitTabText,
              splitType === "percentage" && styles.splitTabTextActive,
            ]}
          >
            Percentage
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.splitTab,
            splitType === "share" && styles.splitTabActive,
          ]}
          onPress={() => setSplitType("share")}
        >
          <Text
            style={[
              styles.splitTabText,
              splitType === "share" && styles.splitTabTextActive,
            ]}
          >
            Share
          </Text>
        </TouchableOpacity>
      </View>

      {/* Participants List */}
      <View style={[styles.participantsList, { marginTop: 16 }]}>
        {splitParticipants.map((participant) => (
          <View key={participant.user_id} style={styles.participantRow}>
            <View style={styles.participantInfo}>
              {participant.profile_image_url ? (
                <Image
                  source={{ uri: participant.profile_image_url }}
                  style={styles.participantAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.participantAvatarPlaceholder}>
                  <Text style={styles.participantAvatarText}>
                    {participant.user_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.participantName}>
                {participant.user_id === currentUser?.user_id
                  ? "You"
                  : participant.user_name}
              </Text>
            </View>

            <View style={styles.participantAmountContainer}>
              {splitType === "percentage" && (
                <View style={styles.percentageInputContainer}>
                  <TextInput
                    value={percentages[participant.user_id] || ""}
                    onChangeText={(value) =>
                      updatePercentage(participant.user_id, value)
                    }
                    placeholder="0"
                    keyboardType="numeric"
                    style={styles.percentageInput}
                    maxLength={5}
                  />
                  <Text style={styles.percentageSymbol}>%</Text>
                </View>
              )}
              {splitType === "share" && (
                <View style={styles.shareInputContainer}>
                  <Text style={styles.currencySymbolSmall}>
                    {currency.symbol}
                  </Text>
                  <TextInput
                    value={shares[participant.user_id] || ""}
                    onChangeText={(value) =>
                      updateShare(participant.user_id, value)
                    }
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    style={styles.shareInput}
                  />
                </View>
              )}
              <Text style={styles.participantAmount}>
                {currency.symbol}
                {getParticipantAmount(participant.user_id)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Validation Messages */}
      {splitType === "percentage" && totalPercentage !== 100 && (
        <Text style={styles.validationError}>
          Total percentage must equal 100% (Current:{" "}
          {totalPercentage.toFixed(1)}%)
        </Text>
      )}
      {splitType === "share" &&
        totalShare > 0 &&
        Math.abs(totalShare - totalAmount) > 0.01 && (
          <Text style={styles.validationError}>
            Total share ({currency.symbol}
            {totalShare.toFixed(2)}) must equal amount ({currency.symbol}
            {totalAmount.toFixed(2)})
          </Text>
        )}
    </View>
  );
};

const ExpenseInputHorizontal = ({
  users,
  selectedItems,
  currentUser,
  payer,
  setPayer,
  amount,
  setAmount,
  currency,
  setCurrency,
  description,
  setDescription,
  splitType,
  setSplitType,
  splitParticipants,
  setSplitParticipants,
  percentages,
  setPercentages,
  shares,
  setShares,
  onSave,
  saving,
}: {
  users: User[];
  selectedItems: SelectedItem[];
  currentUser: User | null;
  payer: Payer;
  setPayer: (payer: Payer) => void;
  amount: string;
  setAmount: (amount: string) => void;
  currency: { code: string; symbol: string; name: string };
  setCurrency: (currency: { code: string; symbol: string; name: string }) => void;
  description: string;
  setDescription: (description: string) => void;
  splitType: SplitType;
  setSplitType: (type: SplitType) => void;
  splitParticipants: User[];
  setSplitParticipants: (participants: User[]) => void;
  percentages: Record<string, string>;
  setPercentages: (percentages: Record<string, string>) => void;
  shares: Record<string, string>;
  setShares: (shares: Record<string, string>) => void;
  onSave: () => void;
  saving: boolean;
}) => {
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const amountRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);

  // Calculate split amount
  const totalParticipants = selectedItems.length + 1; // +1 for "You"
  const splitAmount =
    amount && totalParticipants > 0
      ? (parseFloat(amount) / totalParticipants).toFixed(2)
      : "0.00";

  return (
    <View style={styles.expenseContainer}>
      {/* Who Paid Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Who paid?</Text>
        <TouchableOpacity
          style={styles.payerButton}
          onPress={() => {
            Keyboard.dismiss();
            // TODO: Open payer selection modal
          }}
        >
          {payer === "You" ? (
            <View style={styles.payerContent}>
              <View style={styles.payerAvatarPlaceholder}>
                <Text style={styles.payerAvatarText}>Y</Text>
              </View>
              <Text style={styles.payerName}>You</Text>
            </View>
          ) : (
            <View style={styles.payerContent}>
              {(payer as User).profile_image_url ? (
                <Image
                  source={{ uri: (payer as User).profile_image_url }}
                  style={styles.payerAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.payerAvatarPlaceholder}>
                  <Text style={styles.payerAvatarText}>
                    {(payer as User).user_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.payerName}>{(payer as User).user_name}</Text>
            </View>
          )}
          <Feather name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Amount Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Amount</Text>
        <View style={styles.amountSection}>
          <TouchableOpacity
            style={styles.currencyButton}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
          >
            <Text style={styles.currencySymbol}>{currency.symbol}</Text>
            <Feather name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
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
        {/* {amount && totalParticipants > 1 && (
          <Text style={styles.splitHint}>
            {currency.symbol}
            {splitAmount} per person ({totalParticipants} people)
          </Text>
        )} */}
      </View>

      {/* Description Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Description</Text>
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

      {/* Split Configuration */}
      {selectedItems.length > 0 && (
        <View style={styles.section}>
          <SplitConfiguration
            selectedItems={selectedItems}
            amount={amount}
            currency={currency}
            currentUser={currentUser}
            splitType={splitType}
            setSplitType={setSplitType}
            splitParticipants={splitParticipants}
            setSplitParticipants={setSplitParticipants}
            percentages={percentages}
            setPercentages={setPercentages}
            shares={shares}
            setShares={setShares}
          />
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          (!amount || selectedItems.length === 0 || saving) && styles.saveButtonDisabled,
        ]}
        disabled={!amount || selectedItems.length === 0 || saving}
        onPress={onSave}
      >
        <Text style={styles.saveButtonText}>
          {saving ? "Saving..." : "Save Expense"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddExpensePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Header Section
  shareHeader: {
    backgroundColor: "#fff",
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F0FE",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    gap: 6,
  },
  groupPill: {
    backgroundColor: "#F1E8FF",
  },
  youPill: {
    backgroundColor: "#D6ECFF",
  },
  userPill: {
    backgroundColor: "#E8F0FE",
  },
  avatarContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  removeButton: {
    marginLeft: 4,
    padding: 2,
  },
  inlineInput: {
    minWidth: 120,
    flexGrow: 1,
    fontSize: 16,
    padding: 0,
    color: "#333",
  },
  // Suggestions
  suggestionsContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    maxHeight: 300,
  },
  userSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  suggestionAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  suggestionTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  userMeta: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  // Expense Card
  expenseCard: {
    backgroundColor: "#fff",
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  expenseContainer: {
    gap: 24,
    paddingBottom: 8,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Payer Section
  payerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  payerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  payerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  payerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
  },
  payerAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  payerName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  // Amount Section
  amountSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    gap: 8,
  },
  currencyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: "#e5e5e5",
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    paddingVertical: 12,
  },
  splitHint: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  // Description Section
  descriptionInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    minHeight: 48,
  },
  // Split Configuration
  splitTabs: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  splitTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  splitTabActive: {
    backgroundColor: "#33306b",
  },
  splitTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  splitTabTextActive: {
    color: "#fff",
  },
  participantsList: {
    gap: 12,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  participantAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#33306b",
    justifyContent: "center",
    alignItems: "center",
  },
  participantAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  participantName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  participantAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  percentageInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginRight: 8,
  },
  percentageInput: {
    width: 50,
    fontSize: 14,
    color: "#333",
    textAlign: "right",
  },
  percentageSymbol: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  shareInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginRight: 8,
  },
  currencySymbolSmall: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  shareInput: {
    width: 70,
    fontSize: 14,
    color: "#333",
    textAlign: "right",
  },
  participantAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    minWidth: 70,
    textAlign: "right",
  },
  validationError: {
    fontSize: 12,
    color: "#e74c3c",
    marginTop: 8,
    fontStyle: "italic",
  },
  // Save Button
  saveButton: {
    backgroundColor: "#33306b",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
