import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleTaskNotification, cancelTaskNotification } from '../services/NotificationService';
import { updateTask, checkForScheduleConflict } from '../services/Database';
import { useSQLiteContext } from 'expo-sqlite';
import { ChevronLeft, Calendar, Clock, MapPin, AlignLeft, Tag, Save, XCircle, Repeat, Bell, CheckSquare, BookOpen, Users, Briefcase } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import CustomAlert from '../components/CustomAlert';
import { SafeAreaView } from 'react-native-safe-area-context';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const EditScreen = ({ task, onClose }) => {
    const db = useSQLiteContext();
    const { colors } = useTheme();

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

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description);
    const [category, setCategory] = useState(task.type);
    const [location, setLocation] = useState(task.location); 
    const [date, setDate] = useState(task.date ? new Date(task.date) : new Date());
    const [startDate, setStartDate] = useState(task.start_date ? new Date(task.start_date) : new Date());
    const [endDate, setEndDate] = useState(task.end_date ? new Date(task.end_date) : new Date());
    
    // Time parsing helper
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

    const [time, setTime] = useState(task.time ? parseTimeString(task.time) : new Date());
    
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    
    const [repeatFrequency, setRepeatFrequency] = useState(task.repeat_frequency || 'none');
    const [repeatDays, setRepeatDays] = useState(task.repeat_days ? JSON.parse(task.repeat_days) : []);
    const [reminderMinutes, setReminderMinutes] = useState(task.reminder_minutes || 5);

    const screenTitle = task.type === 'Task' ? 'Edit Task' : 'Edit Schedule';
    const activeType = task.type === 'Task' ? 'Task' : 'Schedule';
    const categories = activeType === 'Task' ? taskCategories : scheduleCategories;

    // Formatting Helpers
    const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const formatTime = (d) => {
        const hours = d.getHours();
        const minutes = d.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${formattedHours}:${formattedMinutes} ${ampm}`;
    };

    // Derived Display Values
    const dateDisplay = formatDate(date);
    const startDateDisplay = formatDate(startDate);
    const endDateDisplay = formatDate(endDate);
    const timeDisplay = formatTime(time);

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if(selectedDate) setDate(selectedDate);
    };

    const onTimeChange = (event, selectedTime) => {
        setShowTimePicker(Platform.OS === 'ios');
        if(selectedTime) setTime(selectedTime);
    };
    
    const handleStartDateChange = (event, selectedDate) => {
        setShowStartDatePicker(Platform.OS === 'ios');
        if (selectedDate) setStartDate(selectedDate);
    };

    const handleEndDateChange = (event, selectedDate) => {
        setShowEndDatePicker(Platform.OS === 'ios');
        if (selectedDate) setEndDate(selectedDate);
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

    const CategoryChip = ({ item }) => {
        const isActive = category === item.name;
        return (
            <TouchableOpacity 
                style={[
                    styles.categoryChip,
                    isActive ? { backgroundColor: item.color, borderColor: item.color } : { backgroundColor: colors.card, borderColor: colors.border }
                ]}
                onPress={() => setCategory(item.name)}
            >
                <item.icon size={18} color={isActive ? '#FFF' : item.color} />
                <Text style={[styles.categoryChipText, { color: isActive ? '#FFF' : colors.textSecondary }]}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    const handleSaveTask = async () => {
        if (!title || !category) {
            showAlert('Error', 'Please fill in all fields.', 'error');
            return;
        }

        const timeString = formatTime(time);
        
        // Handle logic for repeating instances (e.g., ID "15-2023-10-27" -> 15)
        const originalTaskId = typeof task.id === 'string' ? parseInt(task.id.split('-')[0], 10) : task.id;

        // --- CONFLICT CHECK LOGIC ---
        // Only run for Schedules, not Tasks
        if (activeType === 'Schedule') {
            const hasConflict = await checkForScheduleConflict(db, task.userId, {
                time: timeString, 
                date: formatDate(startDate), // For one-time schedules, the date is the start date.
                start_date: formatDate(startDate),
                end_date: formatDate(endDate),
                repeat_frequency: repeatFrequency,
                repeat_days: repeatDays
            }, originalTaskId); // Pass ID to exclude self from check

            if (hasConflict) {
                showAlert('Schedule Conflict', `You already have a schedule at ${timeString}.`, 'error');
                return;
            }
        }

        let newNotificationId = task.notification_id;
        
        if (activeType === 'Task') {
            if (task.notification_id) {
                await cancelTaskNotification(task.notification_id);
            }
            newNotificationId = await scheduleTaskNotification(
                title, 
                formatDate(date), 
                timeString, 
                reminderMinutes
            );
        }

        const updatedTask = {
            id: originalTaskId,
            title,
            description,
            date: activeType === 'Task' ? formatDate(date) : formatDate(startDate),
            time: timeString,
            type: category,
            location: location, 
            repeat_frequency: repeatFrequency,
            repeat_days: repeatFrequency === 'weekly' ? JSON.stringify(repeatDays) : null,
            start_date: activeType === 'Schedule' ? formatDate(startDate) : null,
            end_date: activeType === 'Schedule' ? formatDate(endDate) : null,
            notification_id: newNotificationId,
            reminder_minutes: reminderMinutes
        };

        try {
            await updateTask(db, updatedTask); 
            showAlert('Success', 'Updated successfully!', 'success', [{
                text: 'OK',
                onPress: () => {
                    closeAlert();
                    onClose();
                }
            }]);
        } catch (error) {
            console.error("Failed to update task:", error);
            showAlert('Error', 'Failed to update.', 'error');
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                    <ChevronLeft size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{screenTitle}</Text>
                <View style={{ width: 28 }} /> 
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Title Input */}
                    <View style={[styles.inputCard, { backgroundColor: colors.card }]}>
                        <TextInput 
                            style={[styles.titleInput, { color: colors.textPrimary }]} 
                            value={title} 
                            onChangeText={setTitle} 
                            placeholder="Title" 
                            placeholderTextColor={colors.textSecondary} 
                        />
                    </View>

                    {/* Category Selection */}
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
                        <View style={styles.categoriesWrapper}>
                            {categories.map((cat, index) => (
                                <CategoryChip key={index} item={cat} />
                            ))}
                        </View>
                    </View>

                    {/* Description Input */}
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Description</Text>
                        <View style={[styles.inputCard, { backgroundColor: colors.card, minHeight: 100 }]}>
                            <TextInput 
                                style={[styles.descriptionInput, { color: colors.textPrimary }]} 
                                value={description} 
                                onChangeText={setDescription} 
                                multiline 
                                placeholder="Add details..." 
                                placeholderTextColor={colors.textSecondary} 
                                textAlignVertical="top"
                            />
                        </View>
                    </View>

                    {/* Date & Time Row */}
                    <View style={styles.row}>
                        <View style={[styles.dateTimeContainer, { flex: 1, marginRight: 10 }]}>
                            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                                {activeType === 'Schedule' ? 'Time' : 'Due Time'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.dateTimeButton, { backgroundColor: colors.card }]}>
                                <Clock size={20} color={colors.accentOrange} />
                                <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>{timeDisplay}</Text>
                            </TouchableOpacity>
                        </View>

                        {activeType === 'Task' ? (
                            <View style={[styles.dateTimeContainer, { flex: 1 }]}>
                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Due Date</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.dateTimeButton, { backgroundColor: colors.card }]}>
                                    <Calendar size={20} color={colors.accentOrange} />
                                    <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>{dateDisplay}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Start Date</Text>
                                <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={[styles.dateTimeButton, { backgroundColor: colors.card }]}>
                                    <Calendar size={20} color={colors.accentOrange} />
                                    <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>{startDateDisplay}</Text>
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
                                <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>{endDateDisplay}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Location Input */}
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Location</Text>
                        <View style={[styles.inputWithIconContainer, { backgroundColor: colors.card }]}>
                            <TextInput 
                                style={[styles.inputWithIcon, { color: colors.textPrimary }]} 
                                value={location} 
                                onChangeText={setLocation} 
                                placeholder="Add location" 
                                placeholderTextColor={colors.textSecondary} 
                            />
                            <MapPin size={20} color={colors.accentOrange} />
                        </View>
                    </View>
                    
                    {/* Repeat Options - Only for Schedules */}
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

                    {/* Reminder Section */}
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

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity onPress={handleSaveTask} activeOpacity={0.8} style={{flex: 1}}>
                            <LinearGradient
                                colors={[colors.accentOrange, colors.progressRed]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.saveButton}
                            >
                                <Save size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Save Changes</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onClose}>
                            <XCircle size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Pickers */}
                    {showDatePicker && <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />}
                    {showTimePicker && <DateTimePicker value={time} mode="time" display="default" onChange={onTimeChange} />}
                    {showStartDatePicker && <DateTimePicker value={startDate} mode="date" display="default" onChange={handleStartDateChange} />}
                    {showEndDatePicker && <DateTimePicker value={endDate} mode="date" display="default" onChange={handleEndDateChange} />}

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Custom Alert Component */}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    
    // Inputs
    inputCard: {
        borderRadius: 16,
        paddingHorizontal: 15,
        paddingVertical: 5,
        marginBottom: 20,
    },
    titleInput: {
        fontSize: 20,
        fontWeight: 'bold',
        paddingVertical: 12,
    },
    descriptionInput: {
        fontSize: 16,
        paddingVertical: 12,
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

    // Buttons
    actionButtonsContainer: {
        marginTop: 20,
        gap: 15,
    },
    saveButton: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    cancelButton: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EditScreen;