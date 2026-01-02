import { SplashScreen } from "@/components/splash-screen";
import { Stack } from "expo-router";
import * as SplashScreenExpo from "expo-splash-screen";
import { useEffect, useState } from "react";
import { AuthProvider } from "../src/contexts/AuthContext";
import { useUserStore } from "../src/store/userStore";

function RootLayoutNav() {
  const { initializeAuth, currentUser } = useUserStore();
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    // Prevent the default splash screen from auto-hiding
    SplashScreenExpo.preventAutoHideAsync();
    // Initialize authentication
    initializeAuth();
  }, [initializeAuth]);

  const handleSplashFinish = async () => {
    setIsSplashVisible(false);
    // Hide the native splash screen
    await SplashScreenExpo.hideAsync();
  };

  // Show splash screen for unauthenticated users
  if (!currentUser) {
    if (isSplashVisible) {
      return (
        <SplashScreen onFinish={handleSplashFinish} showLoginButton={true} />
      );
    }
    // After splash animation, show login screen
    return (
      <SplashScreen onFinish={handleSplashFinish} showLoginButton={true} />
    );
  }

  // Show main app for authenticated users
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
