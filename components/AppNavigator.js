import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Calendar, User, XCircle } from 'lucide-react-native'; 
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

// Screens
import HomeScreen from '../screens/HomeScreen';
import PlannerScreen from '../screens/PlannerScreen';
import MissedScreen from '../screens/MissedScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const Colors = {
  background: '#FFFFFF',
  orangeAccent: '#FF8C00',
  redAccent: '#FF3B30',
  textPrimary: '#1C1C1C',
  textSecondary: '#696969',
  inputBackground: '#F7F7F7'
};

// Custom component for pill-shaped tab button
const CustomPillTabButton = ({ children, focused, onPress, ...props }) => {
  return (
    <TouchableOpacity
      {...props}
      onPress={onPress}
      style={[
        styles.tabButton,
        focused && { borderRadius: 30, paddingHorizontal: 18, backgroundColor: '#FF8C0040' } // slight background for active
      ]}
    >
      {focused ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {React.cloneElement(children[0], { color: undefined })} 
          <Text style={styles.activeLabel}>
            {props.accessibilityLabel?.replace('Tab, current screen', '')}
          </Text>
        </View>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

// Gradient icon wrapper
const GradientIcon = ({ IconComponent, size = 26 }) => (
  <MaskedView
    maskElement={<IconComponent color="black" size={size} />}
  >
    <LinearGradient
      colors={[Colors.orangeAccent, Colors.redAccent]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size }}
    />
  </MaskedView>
);

const AppNavigator = ({ user, onLogout }) => {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopWidth: 0,
          height: 90,
          paddingHorizontal: 10,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
        },
        tabBarInactiveTintColor: Colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        children={() => <HomeScreen user={user} />}
        options={{
          tabBarLabel: 'Home',
          headerShown: false,
          tabBarIcon: ({ focused }) =>
            focused ? <GradientIcon IconComponent={Home} size={30} /> : <Home color={Colors.textSecondary} size={26} />,
          tabBarButton: (props) => <CustomPillTabButton {...props} />,
        }}
      />

      <Tab.Screen
        name="PlannerTab"
        component={PlannerScreen}
        options={{
          tabBarLabel: 'Planner',
          headerShown: false,
          tabBarIcon: ({ focused }) =>
            focused ? <GradientIcon IconComponent={Calendar} size={30} /> : <Calendar color={Colors.textSecondary} size={26} />,
          tabBarButton: (props) => <CustomPillTabButton {...props} />,
        }}
      />

      <Tab.Screen
        name="MissedTab"
        component={MissedScreen}
        options={{
          tabBarLabel: 'Missed',
          headerShown: false,
          tabBarIcon: ({ focused }) =>
            focused ? <GradientIcon IconComponent={XCircle} size={30} /> : <XCircle color={Colors.textSecondary} size={26} />,
          tabBarButton: (props) => <CustomPillTabButton {...props} />,
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        children={() => <ProfileScreen onLogout={onLogout} />}
        options={{
          tabBarLabel: 'Profile',
          headerShown: false,
          tabBarIcon: ({ focused }) =>
            focused ? <GradientIcon IconComponent={User} size={30} /> : <User color={Colors.textSecondary} size={26} />,
          tabBarButton: (props) => <CustomPillTabButton {...props} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    height: 50,
    marginVertical: 10,
  },
  activeLabel: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  }
});

export default AppNavigator;
