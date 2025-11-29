import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { Colors } from '../constants/Colors'; // Import colors for consistency

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9500', // Updated to match your App's Accent Orange
    });
  }

  if (!Device.isDevice) {
    // Note: In a service file, we must use native Alerts as we can't render custom UI components here.
    Alert.alert(
      'Device Required',
      'Push notifications are not supported on emulators. Please use a physical device.'
    );
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('Permission Required', 'Please enable notifications in settings to receive task reminders.');
    return null;
  }
  
  return true;
};

// UPDATED: Accepts reminderMinutes and type to calculate the correct trigger time and customize content
export const scheduleTaskNotification = async (title, date, time, reminderMinutes = 5, type = 'Task') => {
  try {
    // Parse the date (YYYY-MM-DD)
    const [year, month, day] = date.split('-').map(Number);
    
    // Parse the time (HH:MM AM/PM)
    const [timePart, modifier] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;

    // Create date object for the task time
    const taskDate = new Date(year, month - 1, day, hours, minutes);
    
    // Calculate the actual notification trigger time
    // Subtract the reminder minutes from the task time
    const triggerDate = new Date(taskDate.getTime() - (reminderMinutes * 60000));

    // If the trigger time is in the past, don't schedule
    if (triggerDate < new Date()) return null;

    // Determine Title and Body based on Type
    const isTask = type === 'Task';
    const notificationTitle = isTask ? "🔔 Upcoming Task" : "📅 Upcoming Schedule";
    const bodyText = isTask 
        ? `Your task "${title}" starts in ${reminderMinutes > 0 ? `in ${reminderMinutes} minutes` : 'now'}!`
        : `Your schedule "${title}" starts ${reminderMinutes > 0 ? `in ${reminderMinutes} minutes` : 'now'}!`;


    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationTitle,
        body: bodyText,
        sound: 'default',
        color: '#FF9500', // Android accent color
        data: { date, time, type }, // Optional data payload
      },
      trigger: triggerDate,
    });
    
    console.log(`Notification scheduled for ${triggerDate} with ID: ${id}`);
    return id;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
};

// NEW: Helper to cancel a specific notification
export const cancelTaskNotification = async (notificationId) => {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`Notification ${notificationId} cancelled`);
  } catch (error) {
    console.error("Error cancelling notification:", error);
  }
};