import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/colors';
import { getDB } from '@/db/database';
import { syncReminders } from '@/lib/notify';
import { useIngredientStore } from '@/store/ingredientStore';
import { useMealPlanStore } from '@/store/mealPlanStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function RootLayout() {
  const plans = useMealPlanStore((s) => s.plans);
  const ingredients = useIngredientStore((s) => s.items);
  const reminders = useSettingsStore((s) => s.reminders);

  useEffect(() => {
    // 앱을 켤 때 DB 를 열고 마이그레이션을 끝낸다
    getDB().catch(console.error);
  }, []);

  // 계획·재고·알림 설정이 바뀌면 예약된 알림을 다시 맞춘다. 연달아 바뀌면 마지막에 한 번만
  useEffect(() => {
    const t = setTimeout(() => syncReminders().catch(console.error), 500);
    return () => clearTimeout(t);
  }, [plans, ingredients, reminders]);

  // 앱으로 돌아올 때마다 예약 기간(14일)을 앞으로 당긴다
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncReminders().catch(console.error);
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            headerTintColor: Colors.primary,
            headerTitleStyle: { fontSize: 17, fontWeight: '600' },
            headerStyle: { backgroundColor: Colors.background },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="ingredient-form"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: '재료 추가',
            }}
          />
          <Stack.Screen
            name="menu-select"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: '메뉴 고르기',
            }}
          />
          <Stack.Screen
            name="recipe-detail"
            options={{
              headerShown: true,
              title: '레시피',
              headerBackTitle: '뒤로',
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              headerShown: true,
              title: '알림',
              headerBackTitle: '뒤로',
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
