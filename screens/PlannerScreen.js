import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskCard } from '../components/TaskCard';
import { useSQLiteContext } from 'expo-sqlite';
import { getRepeatingTasksInDateRange, updateTaskStatus, deleteTask } from '../services/Database';
import { useIsFocused } from '@react-navigation/native';
import EditScreen from './EditScreen';
import { Plus, ChevronLeft, ChevronRight, CalendarDays, AlertCircle, BookOpen, Clock, Calendar, Briefcase } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');

// --- Utility Functions ---
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const convertTo24HourFormat = (time12h) => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  return `${hours}:${minutes}`;
};

const PlannerScreen = ({ navigation, user }) => {
    const { colors } = useTheme();
    const [activeView, setActiveView] = useState('Schedule');
    const [currentDate, setCurrentDate] = useState(new Date());
    const db = useSQLiteContext();
    const [tasks, setTasks] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const isFocused = useIsFocused();
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

    const fetchTasksAndSchedules = useCallback(async () => {
        if (user?.id) {
            try {
                const dateString = formatDate(currentDate);
                const allTodayTasks = await getRepeatingTasksInDateRange(db, user.id, dateString, dateString);
                
                const fetchedTasks = allTodayTasks.filter(t => t.type === 'Task');
                const fetchedSchedules = allTodayTasks.filter(t => t.type !== 'Task');

                // Sort schedules by time
                fetchedSchedules.sort((a, b) => {
                    const timeA = convertTo24HourFormat(a.time);
                    const timeB = convertTo24HourFormat(b.time);
                    return timeA.localeCompare(timeB);
                });

                setTasks(fetchedTasks);
                setSchedules(fetchedSchedules);
            } catch (error) {
                console.error("Failed to fetch tasks and schedules:", error);
            }
        }
    }, [db, user?.id, currentDate]);

    useEffect(() => {
        if (isFocused) {
            fetchTasksAndSchedules();
        }
    }, [isFocused, fetchTasksAndSchedules]);

    const handleAddPress = () => {
        navigation?.navigate('Add', { user: user });
    }
    
    const handleEdit = (task) => {
        setSelectedTask(task);
        setIsEditModalVisible(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalVisible(false);
        setSelectedTask(null);
        fetchTasksAndSchedules();
    };

    const handleDone = async (taskId) => {
        try {
          const originalTaskId = typeof taskId === 'string' ? parseInt(taskId.split('-')[0], 10) : taskId;
          await updateTaskStatus(db, originalTaskId, 'done');
          fetchTasksAndSchedules();
        } catch (error) {
          console.error("Failed to update task status in PlannerScreen:", error);
        }
    };

    const executeDeleteTask = async (taskId) => {
        try {
            const originalTaskId = typeof taskId === 'string' ? parseInt(taskId.split('-')[0], 10) : taskId;
            await deleteTask(db, originalTaskId);
            fetchTasksAndSchedules();
        } catch (error) {
            console.error("Failed to delete task:", error);
            showAlert('Error', 'Could not delete the task.', 'error');
        }
    };

    // UPDATED: Accept 'type' argument
    const handleDelete = (taskId, type) => {
        const itemType = type === 'Task' ? 'Task' : 'Schedule';
        
        showAlert(
            `Delete ${itemType}`, // Dynamic Title
            `Are you sure you want to delete this ${itemType.toLowerCase()}? This action cannot be undone.`, // Dynamic Message
            'info',
            [
                { text: 'Cancel', style: 'cancel', onPress: closeAlert },
                { text: 'Delete', onPress: () => { closeAlert(); executeDeleteTask(taskId); }, style: 'destructive' }
            ]
        );
    };
    
    const goToPreviousDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const goToNextDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    // --- Components ---

    const DateHeader = () => (
        <View style={styles.headerContainer}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Planner</Text>
            <View style={[styles.dateNavigator, { backgroundColor: colors.card }]}>
                <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
                    <ChevronLeft size={22} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                    <CalendarDays size={16} color={colors.accentOrange} style={{ marginRight: 6 }} />
                    <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                        {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                </View>
                <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
                    <ChevronRight size={22} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const ViewTab = ({ text, viewName }) => {
        const isActive = activeView === viewName;
        return (
            <TouchableOpacity
                style={[
                    styles.viewTab, 
                    isActive ? { backgroundColor: colors.accentOrange } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
                ]}
                onPress={() => setActiveView(viewName)}
            >
                <Text
                    style={[
                        styles.viewTabText,
                        { color: isActive ? '#FFF' : colors.textSecondary },
                    ]}
                >
                    {text}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderTimelineSchedule = () => {
        if (schedules.length === 0) {
            return (
                <View style={styles.emptyTasks}>
                    <Calendar size={48} color={colors.textSecondary} style={{ marginBottom: 10, opacity: 0.3 }} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No schedule for this day.</Text>
                </View>
            );
        }

        return schedules.map((task, index) => {
            const time24 = convertTo24HourFormat(task.time);
            const deadline = `${task.date}T${time24}:00`;
            const isLast = index === schedules.length - 1;

            return (
                <View key={task.id.toString()} style={styles.timelineRow}>
                    {/* Time Column */}
                    <View style={styles.timeColumn}>
                        <Text style={[styles.timeText, { color: colors.textPrimary }]}>
                            {task.time.split(' ')[0]}
                        </Text>
                        <Text style={[styles.ampmText, { color: colors.textSecondary }]}>
                            {task.time.split(' ')[1]}
                        </Text>
                    </View>

                    {/* Timeline Line & Dot */}
                    <View style={styles.timelineGraphics}>
                        <View style={[styles.timelineDot, { borderColor: colors.accentOrange, backgroundColor: colors.background }]} />
                        {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
                    </View>

                    {/* Content Column */}
                    <View style={styles.contentColumn}>
                        <TaskCard {...task} deadline={deadline} onDone={handleDone} onEdit={handleEdit} onDelete={handleDelete} />
                    </View>
                </View>
            );
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            
            <DateHeader />

            {/* Gradient Day Summary Card */}
            <LinearGradient
                colors={[colors.purpleAccent, colors.blueAccent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.summaryCard}
            >
                <View style={styles.summaryHeader}>
                    <View>
                        <Text style={styles.summaryDayName}>{currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</Text>
                        <Text style={styles.summaryFullDate}>{currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                    <View style={styles.summaryIcon}>
                        <Calendar size={32} color="#FFF" />
                    </View>
                </View>
                
                <View style={styles.summaryStats}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{schedules.length}</Text>
                        <Text style={styles.statLabel}>Events</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{tasks.length}</Text>
                        <Text style={styles.statLabel}>Tasks</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {tasks.filter(t => t.status === 'done').length}
                        </Text>
                        <Text style={styles.statLabel}>Done</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* View Toggle Tabs */}
            <View style={styles.viewTabsWrapper}>
                <ViewTab text="Timeline Schedule" viewName="Schedule" />
                <ViewTab text={`Tasks (${tasks.length})`} viewName="Tasks" />
            </View>

            {/* Content Scroll */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {activeView === 'Schedule' ? (
                    <View style={styles.timelineContainer}>
                        {renderTimelineSchedule()}
                    </View>
                ) : (
                    <View style={styles.taskListContainer}>
                        {tasks.length > 0 ? (
                            tasks.map(task => {
                                const time24 = convertTo24HourFormat(task.time);
                                const deadline = `${task.date}T${time24}:00`;
                                return <TaskCard key={task.id.toString()} {...task} deadline={deadline} onDone={handleDone} onEdit={handleEdit} onDelete={handleDelete} />;
                            })
                        ) : (
                            <View style={styles.emptyTasks}>
                                <Clock size={48} color={colors.textSecondary} style={{ marginBottom: 10, opacity: 0.3 }} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending tasks for today.</Text>
                            </View>
                        )}
                    </View>
                )}
                {/* Spacer for FAB */}
                <View style={{ height: 80 }} />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity 
                style={[styles.floatingActionButton, { backgroundColor: colors.accentOrange, shadowColor: colors.accentOrange }]} 
                onPress={handleAddPress}
                activeOpacity={0.8}
            >
                <Plus size={32} color="#FFF" />
            </TouchableOpacity>

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
        paddingHorizontal: 10,
    },
    // Header
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    dateNavigator: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        padding: 4,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    navButton: {
        padding: 6,
    },
    dateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    dateText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Gradient Summary Card
    summaryCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 25,
        shadowColor: '#5F50A9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    summaryDayName: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: 'bold',
    },
    summaryFullDate: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
    },
    summaryIcon: {
        justifyContent: 'center',
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 20,
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

    // Tabs
    viewTabsWrapper: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 12,
    },
    viewTab: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 30, // Pill shape
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewTabText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Timeline
    timelineContainer: {
        paddingLeft: 5,
    },
    timelineRow: {
        flexDirection: 'row',
        minHeight: 100,
    },
    timeColumn: {
        width: 60,
        alignItems: 'flex-end',
        paddingRight: 10,
        paddingTop: 10,
    },
    timeText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    ampmText: {
        fontSize: 12,
        marginTop: 2,
    },
    timelineGraphics: {
        width: 20,
        alignItems: 'center',
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 3,
        marginTop: 15,
        zIndex: 2,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        position: 'absolute',
        top: 20, 
        bottom: -20,
    },
    contentColumn: {
        flex: 1,
        paddingBottom: 10,
        paddingLeft: 5,
    },
    
    // Task List Container
    taskListContainer: {
        paddingTop: 5,
    },

    // Common
    scrollContent: {
        paddingBottom: 20,
    },
    emptyTasks: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
    },
    floatingActionButton: {
        position: 'absolute',
        bottom: 110,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
});

export default PlannerScreen;