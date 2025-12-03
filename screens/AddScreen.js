import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addTask, checkForScheduleConflict } from '../services/Database';
import { scheduleTaskNotification } from '../services/NotificationService';
import { ChevronLeft, Check, Calendar, Clock, Briefcase, BookOpen, Repeat, Users, CheckSquare, MapPin, Bell, AlignLeft, Tag } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import CustomAlert from '../components/CustomAlert';

// Category definitions
const scheduleCategories = [
    { name: 'Class', icon: BookOpen, color: '#FF9500' }, 
    { name: 'Routine', icon: Repeat, color: '#00BFFF' }, 
    { name: 'Meeting', icon: Users, color: '#4CAF50' }, 
    { name: 'Work', icon: Briefcase, color: '#5F50A9' }, 
];

const taskCategories = [
    { name: 'Task', icon: CheckSquare, color: '#FFC72C' }, 
];

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AddScreen = ({ navigation, route, user: userProp }) => {
    const { colors } = useTheme();
    const db = useSQLiteContext();
    const user = route.params?.user || userProp;
    const prefilledData = route.params?.prefilledData;

    // --- Custom Alert State ---
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

    // State for form fields
    const [activeType, setActiveType] = useState('Task'); 
    const [taskTitle, setTaskTitle] = useState(prefilledData?.title || '');
    const [selectedCategory, setSelectedCategory] = useState(taskCategories[0].name);
    const [description, setDescription] = useState(prefilledData?.description || '');
    const [repeatFrequency, setRepeatFrequency] = useState('none');
    const [repeatDays, setRepeatDays] = useState([]);
    const [reminderMinutes, setReminderMinutes] = useState(5);
    
    // Date Helpers
    const parseDateString = (dateStr) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const parseTimeString = (timeStr) => {
        if (!timeStr) return new Date();
        const d = new Date();
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        d.setHours(hours, minutes, 0, 0);
        return d;
    };

    const [date, setDate] = useState(prefilledData?.date ? parseDateString(prefilledData.date) : new Date()); 
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [time, setTime] = useState(prefilledData?.time ? parseTimeString(prefilledData.time) : new Date());
    
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const formatTime = (date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        
        // FIX: Pad hours with leading zero to match AI format (08:00 AM)
        const paddedHours = formattedHours < 10 ? `0${formattedHours}` : formattedHours;
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        
        return `${paddedHours}:${formattedMinutes} ${ampm}`;
    };

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [dueDate, setDueDate] = useState(prefilledData?.date || formatDate(new Date()));
    const [startDateString, setStartDateString] = useState(formatDate(new Date()));
    const [endDateString, setEndDateString] = useState(formatDate(new Date()));
    const [dueTime, setDueTime] = useState(prefilledData?.time || formatTime(new Date()));
    const [location, setLocation] = useState('');

    const handleTypeChange = (type) => {
        setActiveType(type);
        if (type === 'Task') {
            setSelectedCategory(taskCategories[0].name);
        } else {
            setSelectedCategory(scheduleCategories[0].name);
        }
        setRepeatDays([]); 
    };

    const CategoryChip = ({ item }) => {
        const isActive = selectedCategory === item.name;
        return (
            <TouchableOpacity 
                style={[
                    styles.categoryChip,
                    isActive ? { backgroundColor: item.color, borderColor: item.color } : { backgroundColor: colors.card, borderColor: colors.border }
                ]}
                onPress={() => setSelectedCategory(item.name)}
            >
                <item.icon size={18} color={isActive ? '#FFF' : item.color} />
                <Text style={[styles.categoryChipText, { color: isActive ? '#FFF' : colors.textSecondary }]}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    // ... Date/Time Handlers ...
    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
            setDueDate(formatDate(selectedDate));
        }
    };

    const handleStartDateChange = (event, selectedDate) => {
        setShowStartDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setStartDate(selectedDate);
            setStartDateString(formatDate(selectedDate));
        }
    };

    const handleEndDateChange = (event, selectedDate) => {
        setShowEndDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setEndDate(selectedDate);
            setEndDateString(formatDate(selectedDate));
        }
    };

    const handleTimeChange = (event, selectedTime) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            setTime(selectedTime);
            setDueTime(formatTime(selectedTime));
        }
    };

    const handleOpenMap = () => {
        // showAlert("Open Map", "This will open a map to select a location.", "info");
    };

    const handleRepeatDayToggle = (day) => {
        setRepeatDays(prevDays => {
            if (prevDays.includes(day)) {
                return prevDays.filter(d => d !== day);
            } else {
                return [...prevDays, day];
            }
        });
    };

    const handleEverydayToggle = () => {
        if (repeatDays.length === weekDays.length) {
            setRepeatDays([]); 
        } else {
            setRepeatDays(weekDays);
        }
    };

    const handleAdd = async () => {
        if (!taskTitle.trim()) {
            showAlert('Validation Error', 'Title is required.', 'error');
            return;
        }
        if (!user?.id) {
            showAlert('Error', 'User not found. Please log in again.', 'error');
            return;
        }

        try {
            // Check for conflict if it is a Schedule
            if (activeType === 'Schedule') {
                const isConflict = await checkForScheduleConflict(db, user.id, {
                    time: dueTime,
                    date: startDateString, // For one-time schedules, the date is the start date.
                    start_date: startDateString,
                    end_date: endDateString,
                    repeat_frequency: repeatFrequency,
                    repeat_days: repeatDays
                });

                if (isConflict) {
                    showAlert('Schedule Conflict', `You already have a schedule at ${dueTime}.`, 'error');
                    return;
                }
            }

            // Schedule notification for BOTH Tasks and Schedules
            let notificationId = null;
            
            // Determine correct date variable based on type
            const targetDate = activeType === 'Task' ? dueDate : startDateString;

            notificationId = await scheduleTaskNotification(
                taskTitle, 
                targetDate, 
                dueTime, 
                reminderMinutes,
                activeType // Pass 'Task' or 'Schedule'
            );

            await addTask(db, {
                title: taskTitle,
                description: description,
                date: activeType === 'Task' ? dueDate : startDateString,
                time: dueTime,
                type: selectedCategory,
                location: location,
                userId: user.id,
                repeat_frequency: repeatFrequency,
                repeat_days: repeatFrequency === 'weekly' ? JSON.stringify(repeatDays) : null,
                start_date: activeType === 'Schedule' ? startDateString : null,
                end_date: activeType === 'Schedule' ? endDateString : null,
                notification_id: notificationId,
                reminder_minutes: reminderMinutes 
            });
            
            showAlert('Success', `${activeType} added successfully!`, 'success', [{
                text: 'OK',
                onPress: () => {
                    closeAlert();
                    navigation.goBack();
                }
            }]);

        } catch (error) {
            console.error("Failed to add task:", error);
            showAlert('Error', `Failed to add ${activeType}. Please try again.`, 'error');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
                    <ChevronLeft size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Create New</Text>
                <View style={{ width: 28 }} />
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    
                    {/* Segmented Control */}
                    <View style={[styles.typeToggleContainer, { backgroundColor: colors.inputBackground }]}>
                        <TouchableOpacity 
                            style={[styles.typeToggleItem, activeType === 'Task' && [styles.typeToggleItemActive, { backgroundColor: colors.card, shadowColor: '#000' }]]}
                            onPress={() => handleTypeChange('Task')}
                        >
                            <Text style={[styles.typeToggleText, { color: activeType === 'Task' ? colors.textPrimary : colors.textSecondary }]}>Task</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.typeToggleItem, activeType === 'Schedule' && [styles.typeToggleItemActive, { backgroundColor: colors.card, shadowColor: '#000' }]]}
                            onPress={() => handleTypeChange('Schedule')}
                        >
                            <Text style={[styles.typeToggleText, { color: activeType === 'Schedule' ? colors.textPrimary : colors.textSecondary }]}>Schedule</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Title Input */}
                    <View style={[styles.inputCard, { backgroundColor: colors.card }]}>
                        <TextInput
                            style={[styles.titleInput, { color: colors.textPrimary }]}
                            placeholder="What needs to be done?"
                            placeholderTextColor={colors.textSecondary}
                            value={taskTitle}
                            onChangeText={setTaskTitle}
                        />
                    </View>

                    {/* Category Selection */}
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
                        <View style={styles.categoriesWrapper}>
                            {(activeType === 'Task' ? taskCategories : scheduleCategories).map(item => (
                                <CategoryChip key={item.name} item={item} />
                            ))}
                        </View>
                    </View>

                    {/* Date & Time Row */}
                    <View style={styles.row}>
                        <View style={[styles.dateTimeContainer, { flex: 1, marginRight: 10 }]}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{activeType === 'Schedule' ? 'Time' : 'Due Time'}</Text>
                            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.dateTimeButton, { backgroundColor: colors.card }]}>
                                <Clock size={20} color={colors.accentOrange} />
                                <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>{dueTime}</Text>
                            </TouchableOpacity>
                        </View>

                        {activeType === 'Task' ? (
                            <View style={[styles.dateTimeContainer, { flex: 1 }]}>
                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Due Date</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.dateTimeButton, { backgroundColor: colors.card }]}>
                                    <Calendar size={20} color={colors.accentOrange} />
                                    <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>{dueDate}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Start Date</Text>
                                <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={[styles.dateTimeButton, { backgroundColor: colors.card }]}>
                                    <Calendar size={20} color={colors.accentOrange} />
                                    <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>{startDateString}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* End Date for Schedule */}
                    {activeType === 'Schedule' && (
                        <View style={[styles.sectionContainer, { marginTop: 10 }]}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>End Date</Text>
                            <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={[styles.dateTimeButton, { backgroundColor: colors.card }]}>
                                <Calendar size={20} color={colors.accentOrange} />
                                <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>{endDateString}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Repeat Options (Schedule Only) */}
                    {activeType === 'Schedule' && (
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Repeat</Text>
                            <View style={[styles.repeatOptionsContainer, { backgroundColor: colors.card }]}>
                                {['none', 'daily', 'weekly'].map((option) => (
                                    <TouchableOpacity 
                                        key={option}
                                        onPress={() => setRepeatFrequency(option)}
                                        style={[
                                            styles.repeatOption, 
                                            repeatFrequency === option && { backgroundColor: colors.accentOrange + '20', borderColor: colors.accentOrange }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.repeatOptionText, 
                                            { color: repeatFrequency === option ? colors.accentOrange : colors.textSecondary, textTransform: 'capitalize' }
                                        ]}>{option}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            
                            {repeatFrequency === 'weekly' && (
                                <View style={styles.weekDaysContainer}>
                                    {weekDays.map((day) => (
                                        <TouchableOpacity 
                                            key={day} 
                                            onPress={() => handleRepeatDayToggle(day)} 
                                            style={[
                                                styles.dayCircle, 
                                                { backgroundColor: colors.inputBackground },
                                                repeatDays.includes(day) && { backgroundColor: colors.purpleAccent }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.dayText, 
                                                { color: repeatDays.includes(day) ? '#FFF' : colors.textSecondary }
                                            ]}>{day.charAt(0)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Location */}
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Location</Text>
                        <View style={[styles.inputWithIconContainer, { backgroundColor: colors.card }]}>
                            <TextInput
                                style={[styles.inputWithIcon, { color: colors.textPrimary }]}
                                placeholder="Add location"
                                placeholderTextColor={colors.textSecondary}
                                value={location}
                                onChangeText={setLocation}
                            />
                            <TouchableOpacity onPress={handleOpenMap}>
                                <MapPin size={20} color={colors.accentOrange} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Description</Text>
                        <View style={[styles.inputCard, { backgroundColor: colors.card, minHeight: 100 }]}>
                            <TextInput
                                style={[styles.descriptionInput, { color: colors.textPrimary }]}
                                placeholder="Add details..."
                                placeholderTextColor={colors.textSecondary}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Reminder */}
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Remind Me</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reminderScroll}>
                            {[0, 5, 10, 15, 30, 60].map((min) => (
                                <TouchableOpacity
                                    key={min}
                                    style={[
                                        styles.reminderChip,
                                        { backgroundColor: colors.card, borderColor: colors.border },
                                        reminderMinutes === min && { backgroundColor: colors.purpleAccent, borderColor: colors.purpleAccent }
                                    ]}
                                    onPress={() => setReminderMinutes(min)}
                                >
                                    <Text style={[
                                        styles.reminderText, 
                                        { color: reminderMinutes === min ? '#FFF' : colors.textPrimary }
                                    ]}>
                                        {min === 0 ? 'At time' : `${min}m before`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Add Button */}
                    <TouchableOpacity onPress={handleAdd} activeOpacity={0.8}>
                        <LinearGradient
                            colors={[colors.accentOrange, colors.progressRed]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.addButton}
                        >
                            <Text style={styles.addButtonText}>Create {activeType}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Pickers (Hidden) */}
                    {showDatePicker && <DateTimePicker value={date} mode="date" display="default" onChange={handleDateChange} />}
                    {showStartDatePicker && <DateTimePicker value={startDate} mode="date" display="default" onChange={handleStartDateChange} />}
                    {showEndDatePicker && <DateTimePicker value={endDate} mode="date" display="default" onChange={handleEndDateChange} />}
                    {showTimePicker && <DateTimePicker value={time} mode="time" display="default" onChange={handleTimeChange} />}

                </ScrollView>
            </KeyboardAvoidingView>

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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    
    // Type Toggle
    typeToggleContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    typeToggleItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    typeToggleItemActive: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    typeToggleText: {
        fontSize: 16,
        fontWeight: '600',
    },

    // Inputs
    inputCard: {
        borderRadius: 16,
        paddingHorizontal: 15,
        paddingVertical: 5,
        marginBottom: 20,
    },
    titleInput: {
        fontSize: 18,
        fontWeight: '600',
        paddingVertical: 10,
    },
    descriptionInput: {
        fontSize: 16,
        paddingVertical: 10,
        minHeight: 100,
    },
    
    // Section Headers
    sectionContainer: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        marginLeft: 4,
    },

    // Categories
    categoriesWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    categoryChipText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '500',
    },

    // Date Time
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    dateTimeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 16,
    },
    dateTimeText: {
        marginLeft: 10,
        fontSize: 16,
        fontWeight: '500',
    },

    // Repeat
    repeatOptionsContainer: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 5,
        gap: 10,
        marginBottom: 10,
    },
    repeatOption: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    repeatOptionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    weekDaysContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    dayCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Location
    inputWithIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        borderRadius: 16,
        height: 50,
    },
    inputWithIcon: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },

    // Reminder
    reminderScroll: {
        gap: 10,
    },
    reminderChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    reminderText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Button
    addButton: {
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    addButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default AddScreen;