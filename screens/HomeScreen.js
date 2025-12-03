import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskCard } from '../components/TaskCard';
import { useSQLiteContext } from 'expo-sqlite';
import { 
  getAllTasks, 
  getTaskById, 
  updateTaskStatus, 
  deleteTask, 
  updateUserNotifications, 
  getUpcomingTasks, 
  updateTaskNotifications 
} from '../services/Database'; 
import { useIsFocused } from '@react-navigation/native';
import { Bell, BellOff, Sparkles, ListFilter, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import EditScreen from './EditScreen';
import { useTheme } from '../context/ThemeContext';
import CustomAlert from '../components/CustomAlert';
import { cancelTaskNotification, cancelAllNotifications, scheduleTaskNotification, scheduleMissedNotification } from '../services/NotificationService';

const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (num) => (num < 10 ? '0' + num : num);
  return `${year}-${pad(month)}-${pad(day)}`;
};

const getFormattedDate = () => {
  const date = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

const getDayName = () => {
  const date = new Date();
  const options = { weekday: 'long' };
  return date.toLocaleDateString('en-US', options);
};

const convertTo24HourFormat = (time12h) => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  return `${hours}:${minutes}`;
};

const HomeScreen = ({ user, navigation }) => {
  const { colors, isNotificationsEnabled, toggleNotifications } = useTheme();
  const userName = user.name;
  const initial = userName.split(' ').map(n => n[0]).join('');
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const profilePicture = user?.profile_picture;

  const [activeTab, setActiveTab] = useState('Upcoming');
  const [activeFilter, setActiveFilter] = useState('All');
  const [tasks, setTasks] = useState([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [allTasks, setAllTasks] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // --- Alert Config ---
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: []
  });

  const showAlert = (title, message, type = 'info', buttons = []) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  // --- Toast Notification State ---
  const [toastMessage, setToastMessage] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = (message) => {
      setToastMessage(message);
      Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
      }).start();

      setTimeout(() => {
          Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
          }).start(() => setToastMessage(null));
      }, 2000);
  };

  const fetchTasks = useCallback(async () => {
    if (user?.id) {
      try {
        const today = getCurrentDate();
        let fetchedTasks;
        let typeFilterClause = "";
        if (activeFilter === 'Task') {
          typeFilterClause = " AND type = 'Task'";
        } else if (activeFilter === 'Schedule') {
          typeFilterClause = " AND type != 'Task'";
        }

        switch (activeTab) {
          case 'All':
            fetchedTasks = await db.getAllAsync(`SELECT * FROM tasks WHERE userId = ?${typeFilterClause}`, [user.id]);
            break;
          case 'Today':
            fetchedTasks = await db.getAllAsync(`SELECT * FROM tasks WHERE userId = ? AND date = ?${typeFilterClause}`, [user.id, today]);
            break;
          case 'Upcoming':
            fetchedTasks = await db.getAllAsync(`SELECT * FROM tasks WHERE userId = ? AND date > ? AND status != 'done'${typeFilterClause}`, [user.id, today]);
            break;
          case 'Completed':
            fetchedTasks = await db.getAllAsync(`SELECT * FROM tasks WHERE userId = ? AND status = 'done'${typeFilterClause}`, [user.id]);
            break;
          default:
            fetchedTasks = [];
        }
        setTasks(fetchedTasks);
        if(activeTab === 'All') {
          setAllTasks(fetchedTasks);
        } else {
          const all = await getAllTasks(db, user.id);
          setAllTasks(all);
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      }
    }
  }, [db, user?.id, activeTab, activeFilter]);

  useEffect(() => {
    if (isFocused) {
      fetchTasks();
    }
  }, [isFocused, fetchTasks]);

  const handleDone = async (taskId) => {
    try {
      // 1. Fetch Task to get Notification IDs
      const task = await getTaskById(db, taskId);
      
      // 2. Cancel Notifications if they exist
      if (task) {
          if (task.notification_id) await cancelTaskNotification(task.notification_id);
          if (task.missed_notification_id) await cancelTaskNotification(task.missed_notification_id);
      }

      // 3. Update Status
      await updateTaskStatus(db, taskId, 'done');
      fetchTasks();
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const executeDeleteTask = async (taskId) => {
    try {
        // 1. Fetch Task to get IDs
        const task = await getTaskById(db, taskId);
        
        // 2. Cancel Notifications
        if (task) {
            if (task.notification_id) await cancelTaskNotification(task.notification_id);
            if (task.missed_notification_id) await cancelTaskNotification(task.missed_notification_id);
        }

        // 3. Delete
        await deleteTask(db, taskId);
        fetchTasks();
        showToast("Task deleted successfully");
    } catch (error) {
        console.error("Failed to delete task:", error);
        showAlert('Error', 'Could not delete the task.', 'error');
    }
  };

  const handleDelete = (taskId, type) => {
    const itemType = type === 'Task' ? 'Task' : 'Schedule';

    showAlert(
        `Delete ${itemType}`,
        `Are you sure you want to delete this ${itemType.toLowerCase()}? This action cannot be undone.`,
        'info',
        [
            { text: 'Cancel', style: 'cancel', onPress: closeAlert },
            { 
                text: 'Delete', 
                onPress: () => {
                    closeAlert();
                    executeDeleteTask(taskId);
                } 
            }
        ]
    );
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setIsEditModalVisible(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalVisible(false);
    setSelectedTask(null);
    fetchTasks();
  };

  const dayName = getDayName();
  const formattedDate = getFormattedDate();

  const handleNotificationPress = async () => {
    const newStatus = !isNotificationsEnabled;
    toggleNotifications(); // Flip UI state immediately
    
    // 1. Update Database
    await updateUserNotifications(db, user.id, newStatus);

    // 2. Handle System Notifications
    if (!newStatus) {
        // Turning OFF: Cancel ALL pending
        await cancelAllNotifications();
        showToast("Notifications disabled");
    } else {
        // Turning ON: Reschedule ALL future pending tasks
        showToast("Rescheduling notifications...");
        const today = new Date().toISOString().split('T')[0];
        const upcomingTasks = await getUpcomingTasks(db, user.id, today);
        
        for (const task of upcomingTasks) {
            // Schedule Standard
            const notifId = await scheduleTaskNotification(
                task.title, 
                task.date, 
                task.time, 
                task.reminder_minutes || 5, 
                task.type
            );
            
            // Schedule Missed (if non-repeating)
            let missedNotifId = null;
            // CHANGE: Only schedule missed notifications for non-repeating TASKS
            if ((!task.repeat_frequency || task.repeat_frequency === 'none') && task.type === 'Task') {
                missedNotifId = await scheduleMissedNotification(
                    task.title,
                    task.date,
                    task.time,
                    task.type
                );
            }

            await updateTaskNotifications(db, task.id, notifId, missedNotifId);
        }
        showToast(`Notifications enabled`);
    }
  };

  const toggleFilterVisibility = () => {
    setIsFilterVisible(!isFilterVisible);
  };

  const getSectionTitle = () => {
    if (activeFilter === 'All') return 'Tasks and Schedules';
    if (activeFilter === 'Task') return 'My Tasks';
    if (activeFilter === 'Schedule') return 'My Schedules';
    return 'My Tasks'; // Default fallback
  };

  // Calculations for stats
  const taskItems = allTasks.filter(t => t.type === 'Task');
  const scheduleItems = allTasks.filter(t => t.type !== 'Task');

  const totalTasksCount = taskItems.length;
  const totalSchedulesCount = scheduleItems.length;

  const completedTasksCount = taskItems.filter(t => t.status === 'done').length;
  const completedSchedulesCount = scheduleItems.filter(t => t.status === 'done').length;
  const allCompletedCount = allTasks.filter(t => t.status === 'done').length;

  // Custom Tab Chip Component
  const TabChip = ({ label, active }) => (
    <View style={[styles.tabChip, active ? { backgroundColor: colors.accentOrange } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
        <Text style={[styles.tabChipText, active ? { color: '#FFF' } : { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.userInfo}>
            <View style={[styles.avatarContainer, { borderColor: colors.accentOrange }]}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.accentOrange }]}>
                  <Text style={[styles.avatarText, { color: colors.card }]}>{initial}</Text>
                </View>
              )}
            </View>
            <View>
              <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Welcome back,</Text>
              <Text style={[styles.userNameText, { color: colors.textPrimary }]}>{userName}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.notificationButton, { backgroundColor: colors.card }]} 
            onPress={handleNotificationPress}
          >
              {isNotificationsEnabled ? (
                  <View>
                    <Bell size={24} color={colors.textPrimary} />
                    <View style={styles.notificationBadge} />
                  </View>
              ) : (
                  <BellOff size={24} color={colors.textSecondary} />
              )}
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <LinearGradient
            colors={[colors.accentOrange, colors.progressRed]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCard}
        >
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardDate}>{formattedDate}</Text>
                    <Text style={styles.cardDay}>{dayName}</Text>
                </View>
                <View style={styles.cardIcon}>
                    <Sparkles size={32} color="#FFF" />
                </View>
            </View>
            
            <View style={styles.cardStats}>
                {activeFilter === 'All' && (
                    <>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{totalTasksCount}</Text>
                            <Text style={styles.statLabel}>Total Task</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{totalSchedulesCount}</Text>
                            <Text style={styles.statLabel}>Total Schedule</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{allCompletedCount}</Text>
                            <Text style={styles.statLabel}>Task Completed</Text>
                        </View>
                    </>
                )}

                {activeFilter === 'Task' && (
                    <>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{totalTasksCount}</Text>
                            <Text style={styles.statLabel}>Total Task</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{completedTasksCount}</Text>
                            <Text style={styles.statLabel}> Task Completed</Text>
                        </View>
                    </>
                )}

                {activeFilter === 'Schedule' && (
                    <>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{totalSchedulesCount}</Text>
                            <Text style={styles.statLabel}>Total Schedule</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{completedSchedulesCount}</Text>
                            <Text style={styles.statLabel}>Task Completed</Text>
                        </View>
                    </>
                )}
            </View>
        </LinearGradient>

        {/* Filter & Tabs Section */}
        <View style={styles.controlsContainer}>
            <View style={styles.listHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{getSectionTitle()}</Text>
                <TouchableOpacity onPress={toggleFilterVisibility} style={styles.filterButton}>
                    <ListFilter size={20} color={isFilterVisible ? colors.accentOrange : colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {isFilterVisible && (
                <View style={styles.subFilterContainer}>
                    {['All', 'Task', 'Schedule'].map((filter) => (
                        <TouchableOpacity 
                            key={filter} 
                            onPress={() => setActiveFilter(filter)}
                            style={[styles.subFilterChip, activeFilter === filter && { backgroundColor: colors.accentOrange + '20', borderColor: colors.accentOrange }]}
                        >
                            <Text style={[styles.subFilterText, { color: activeFilter === filter ? colors.accentOrange : colors.textSecondary }]}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
                {['All', 'Today', 'Upcoming', 'Task Completed'].map((tab) => (
                    <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
                        <TabChip label={tab} active={activeTab === tab} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {/* Task List */}
        <FlatList
          data={tasks}
          renderItem={({ item }) => {
            const time24 = convertTo24HourFormat(item.time);
            const deadline = `${item.date}T${time24}:00`;
            return <TaskCard {...item} deadline={deadline} onDone={handleDone} onEdit={handleEdit} onDelete={handleDelete} />;
          }}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.taskList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyTasks}>
                <CheckCircle2 size={60} color={colors.textSecondary} style={{ opacity: 0.3, marginBottom: 10 }} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tasks found.</Text>
            </View>
          )}
        />
      </View>

      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        onRequestClose={handleCloseEditModal}
      >
        {selectedTask && (
          <EditScreen
            task={selectedTask}
            onClose={handleCloseEditModal}
          />
        )}
      </Modal>

      {/* Toast Notification */}
      {toastMessage && (
          <Animated.View style={[
              styles.toastContainer, 
              { opacity: fadeAnim, backgroundColor: colors.card, borderColor: colors.border }
          ]}>
              <Text style={[styles.toastText, { color: colors.textPrimary }]}>{toastMessage}</Text>
          </Animated.View>
      )}

      {/* Custom Alert */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={closeAlert}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
    borderWidth: 2,
    borderRadius: 25,
    padding: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  userNameText: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4500',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  gradientCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardDate: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardDay: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  cardIcon: {
    justifyContent: 'center',
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 16,
    padding: 15,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  controlsContainer: {
    marginBottom: 15,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterButton: {
    padding: 5,
  },
  subFilterContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  subFilterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabsScroll: {
    marginBottom: 5,
  },
  tabsContent: {
    paddingRight: 20,
    gap: 10,
  },
  tabChip: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 25,
    minWidth: 70,
    alignItems: 'center',
  },
  tabChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskList: {
    paddingBottom: 0, // Changed from 100 to 0
  },
  emptyTasks: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
  },
  toastContainer: {
      position: 'absolute',
      bottom: 80,
      alignSelf: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 30,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
  },
  toastText: {
      fontSize: 14,
      fontWeight: '600',
  }
});

export default HomeScreen;