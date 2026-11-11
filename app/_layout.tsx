import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/colors';
import { getDB } from '@/db/database';

export default function RootLayout() {
  useEffect(() => {
    // 앱을 켤 때 DB 를 열고 마이그레이션을 끝낸다
    getDB().catch(console.error);
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
