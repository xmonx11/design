import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TaskCard } from '../components/TaskCard';
import { useSQLiteContext } from 'expo-sqlite';
import { getMissedTasks, updateTaskStatus, deleteTask } from '../services/Database';
import { useIsFocused } from '@react-navigation/native';
import EditScreen from './EditScreen';
import { useTheme } from '../context/ThemeContext';
import CustomAlert from '../components/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, CalendarOff, ListFilter } from 'lucide-react-native';

// --- Utility Functions ---
const convertTo24HourFormat = (time12h) => {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  return `${hours}:${minutes}`;
};

const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (num) => (num < 10 ? '0' + num : num);
  return `${year}-${pad(month)}-${pad(day)}`;
};

const MissedScreen = ({ user }) => {
    const { colors } = useTheme();
    const db = useSQLiteContext();
    const [missedTasks, setMissedTasks] = useState([]);
    const isFocused = useIsFocused();
    const [activeFilter, setActiveFilter] = useState('Today');
    
    // Modal & Alert States
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
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

    const fetchMissed = useCallback(async () => {
        if (user?.id) {
            try {
                const fetchedPotentialMissedTasks = await getMissedTasks(db, user.id);
                const now = new Date();
                const today = getCurrentDate();

                let trulyMissedTasks = fetchedPotentialMissedTasks.filter(task => {
                    const time24 = convertTo24HourFormat(task.time);
                    const deadline = new Date(`${task.date}T${time24}:00`);
                    return deadline < now;
                });

                // Apply local filtering based on tab
                if (activeFilter === 'Today') {
                    trulyMissedTasks = trulyMissedTasks.filter(task => task.date === today);
                }
                
                // Sort by most recent missed first (closest to now)
                trulyMissedTasks.sort((a, b) => {
                    const dateA = new Date(`${a.date}T${convertTo24HourFormat(a.time)}:00`);
                    const dateB = new Date(`${b.date}T${convertTo24HourFormat(b.time)}:00`);
                    return dateB - dateA; 
                });

                setMissedTasks(trulyMissedTasks);
            } catch (error) {
                console.error("Failed to fetch missed tasks:", error);
            }
        }
    }, [db, user?.id, activeFilter]);

    useEffect(() => {
        if (isFocused) {
            fetchMissed();
        }
    }, [isFocused, fetchMissed]);

    const handleDone = async (taskId) => {
        try {
          await updateTaskStatus(db, taskId, 'done');
          fetchMissed(); 
        } catch (error) {
          console.error("Failed to update task status from MissedScreen:", error);
        }
    };

    const executeDeleteTask = async (taskId) => {
        try {
            await deleteTask(db, taskId);
            fetchMissed();
        } catch (error) {
            console.error("Failed to delete task:", error);
            showAlert('Error', 'Could not delete the task.', 'error');
        }
    };

    // UPDATED: Accept 'type' argument
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
                    onPress: () => { closeAlert(); executeDeleteTask(taskId); },
                    style: 'destructive'
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
        fetchMissed(); 
    };

    // Sub-component for Filter Tabs
    const FilterTab = ({ label }) => {
        const isActive = activeFilter === label;
        return (
            <TouchableOpacity
                style={[
                    styles.filterTab, 
                    isActive ? { backgroundColor: colors.cancelRed } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
                ]}
                onPress={() => setActiveFilter(label)}
            >
                <Text style={[styles.filterTabText, isActive ? { color: '#FFF' } : { color: colors.textSecondary }]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Missed Tasks</Text>
            </View>

            {/* Warning / Summary Card */}
            <LinearGradient
                colors={[colors.cancelRed, '#FF6B6B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.alertCard}
            >
                <View style={styles.alertContent}>
                    <View>
                        <Text style={styles.alertTitle}>Attention Needed</Text>
                        <Text style={styles.alertSubtitle}>
                            You have <Text style={styles.alertCount}>{missedTasks.length}</Text> missed {missedTasks.length === 1 ? 'task' : 'tasks'} {activeFilter === 'Today' ? 'today' : 'in total'}.
                        </Text>
                    </View>
                    <View style={styles.alertIcon}>
                        <AlertCircle size={32} color="#FFF" />
                    </View>
                </View>
            </LinearGradient>

            {/* Filter Section */}
            <View style={styles.filterSection}>
                <View style={styles.filterLabelRow}>
                    <ListFilter size={18} color={colors.textSecondary} />
                    <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Filter By Date</Text>
                </View>
                <View style={styles.tabsContainer}>
                    <FilterTab label="Today" />
                    <FilterTab label="All" />
                </View>
            </View>

            {/* Task List */}
            <FlatList
                data={missedTasks}
                renderItem={({ item }) => {
                    const time24 = convertTo24HourFormat(item.time);
                    const deadline = `${item.date}T${time24}:00`;
                    return (
                        <View style={styles.taskWrapper}>
                            <TaskCard 
                                {...item} 
                                deadline={deadline} 
                                onDone={handleDone} 
                                onEdit={handleEdit} 
                                onDelete={handleDelete} 
                            />
                        </View>
                    );
                }}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.taskList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <CalendarOff size={64} color={colors.textSecondary} style={{ opacity: 0.3, marginBottom: 15 }} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No missed tasks!</Text>
                        <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>You're all caught up.</Text>
                    </View>
                )}
            />

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
    header: {
        paddingVertical: 15,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    
    // Alert Card
    alertCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 25,
        shadowColor: '#D32F2F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    alertContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    alertTitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 5,
    },
    alertSubtitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
        maxWidth: 220,
        lineHeight: 22,
    },
    alertCount: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    alertIcon: {
        justifyContent: 'center',
    },

    // Filters
    filterSection: {
        marginBottom: 15,
    },
    filterLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 6,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    tabsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    filterTab: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 25,
        minWidth: 80,
        alignItems: 'center',
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // List
    taskList: {
        paddingBottom: 0, // Changed from 4 to 0
    },
    taskWrapper: {
        marginBottom: 4, // Spacing between cards handled by TaskCard margin usually, but ensuring flow
    },
    
    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 15,
    },
});

export default MissedScreen;