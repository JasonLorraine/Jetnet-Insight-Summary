import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/contexts/AuthContext";
import { useThemeColors } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" as const },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="login"
        options={{ title: "Connect to JETNET", presentation: "modal" }}
      />
      <Stack.Screen
        name="setup-llm"
        options={{ title: "AI Configuration", presentation: "modal" }}
      />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen
        name="aircraft/[registration]"
        options={{ title: "Aircraft Profile" }}
      />
      <Stack.Screen
        name="summary/[registration]"
        options={{ title: "AI Summary", presentation: "modal" }}
      />
      <Stack.Screen
        name="contacts/[registration]"
        options={{ title: "All Contacts" }}
      />
      <Stack.Screen
        name="settings"
        options={{ title: "Settings", presentation: "modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
