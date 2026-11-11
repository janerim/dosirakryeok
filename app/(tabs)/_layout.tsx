import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

/** 선택된 탭은 채운 아이콘, 나머지는 선 아이콘. 색은 탭바 글자(active/inactive)와 같게 (책력과 동일) */
const tabIcon = (name: 'calendar' | 'snow' | 'today' | 'restaurant' | 'cart') =>
  function TabIcon({ focused, size }: { focused: boolean; size: number }) {
    return (
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={size}
        color={focused ? Colors.primary : Colors.textSecondary}
      />
    );
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.border,
          backgroundColor: Colors.background,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '달력', tabBarIcon: tabIcon('calendar') }}
      />
      <Tabs.Screen
        name="fridge"
        options={{ title: '냉장고', tabBarIcon: tabIcon('snow') }}
      />
      <Tabs.Screen
        name="this-week"
        options={{ title: '이번 주', tabBarIcon: tabIcon('today') }}
      />
      <Tabs.Screen
        name="recipes"
        options={{ title: '레시피', tabBarIcon: tabIcon('restaurant') }}
      />
      <Tabs.Screen
        name="shopping"
        options={{ title: '장보기', tabBarIcon: tabIcon('cart') }}
      />
    </Tabs>
  );
}
