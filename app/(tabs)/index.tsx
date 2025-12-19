import { View, Text } from "react-native";
import { useEffect } from "react";
import { useBalanceStore } from "../../src/store/balanceStore";

export default function HomeScreen() {
  const { owedByYou, owedToYou, fetchBalances } = useBalanceStore();

  useEffect(() => {
    fetchBalances();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>You owe: ₹{owedByYou}</Text>
      <Text>You are owed: ₹{owedToYou}</Text>
    </View>
  );
}
