import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, TextInput, 
    ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, Image, ScrollView, Dimensions
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker'; 
import { getUpcomingTasks, addTask } from '../services/Database';
import { scheduleTaskNotification } from '../services/NotificationService';
import { getScheduleRecommendation } from '../services/AiServices';
import { Wand2, X, Send, Plus, Calendar, Check, Sparkles, Image as ImageIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';

const AiAssistantScreen = ({ navigation, route }) => {
    const { user } = route.params;
    const { colors } = useTheme();
    const db = useSQLiteContext();
    const insets = useSafeAreaInsets();

    const [aiPrompt, setAiPrompt] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [generatedTasks, setGeneratedTasks] = useState([]); 
    const [isAiLoading, setIsAiLoading] = useState(false);

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

    const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

    // --- Image Picker ---
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0]);
        }
    };

    // --- Submit to Gemini ---
    const handleAiSubmit = async () => {
        if (!aiPrompt.trim() && !selectedImage) return;
        Keyboard.dismiss();
        
        setIsAiLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0]; 
            const allUpcomingTasks = await getUpcomingTasks(db, user.id, today);
            
            const recommendations = await getScheduleRecommendation(
                allUpcomingTasks.slice(0, 20), 
                aiPrompt,
                selectedImage?.base64
            );
            
            setGeneratedTasks(recommendations);
        } catch (error) {
            console.error("AI generation failed:", error);
            showAlert("Error", "Failed to generate schedule. Please try again.", 'error');
        } finally {
            setIsAiLoading(false);
        }
    };

    // --- Bulk Add Logic ---
    const handleAcceptAll = async () => {
        try {
            for (const task of generatedTasks) {
                const notifId = await scheduleTaskNotification(task.title, task.date, task.time, 5, task.type);
                
                await addTask(db, {
                    title: task.title,
                    description: task.description || 'AI Generated',
                    date: task.date,
                    time: task.time,
                    type: task.type || 'Task',
                    location: '',
                    userId: user.id,
                    repeat_frequency: 'none',
                    notification_id: notifId,
                    reminder_minutes: 5
                });
            }
            showAlert("Success", `${generatedTasks.length} items added to your schedule!`, 'success', [
                { text: "OK", onPress: () => { closeAlert(); navigation.goBack(); } }
            ]);
        } catch (e) {
            console.error(e);
            showAlert("Error", "Could not save all tasks. Please try again.", 'error');
        }
    };

    const handleClose = () => {
        navigation.goBack();
    };

    const removeTask = (index) => {
        const newTasks = [...generatedTasks];
        newTasks.splice(index, 1);
        setGeneratedTasks(newTasks);
    };

    return (
        <View style={styles.modalOverlay}>
            {/* Transparent Backdrop */}
            <TouchableOpacity 
                style={styles.modalBackdrop} 
                activeOpacity={1} 
                onPress={handleClose} 
            />
            
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.aiKeyboardContainer}
                pointerEvents="box-none"
            >
                <View style={[styles.aiBottomSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
                    
                    {/* Handle Bar */}
                    <View style={styles.handleContainer}>
                        <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={styles.titleWrapper}>
                            <View style={[styles.iconBadge, { backgroundColor: colors.accentOrange + '20' }]}>
                                <Wand2 size={20} color={colors.accentOrange} />
                            </View>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                                {generatedTasks.length > 0 ? "Review Plan" : "AI Assistant"}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={[styles.closeButton, { backgroundColor: colors.inputBackground }]}>
                            <X size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Content Area */}
                    <ScrollView 
                        style={styles.contentArea} 
                        contentContainerStyle={generatedTasks.length === 0 && !isAiLoading ? styles.centerContent : null}
                        showsVerticalScrollIndicator={false}
                    >
                        {isAiLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.accentOrange} />
                                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                                    {selectedImage ? "Analyzing image & schedule..." : "Optimizing your plan..."}
                                </Text>
                            </View>
                        ) : generatedTasks.length > 0 ? (
                            // Result List
                            generatedTasks.map((task, index) => (
                                <View 
                                    key={index} 
                                    style={[styles.resultCard, { backgroundColor: colors.card, shadowColor: colors.shadow || '#000' }]}
                                >
                                    <View style={styles.resultHeader}>
                                        <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{task.title}</Text>
                                        <TouchableOpacity onPress={() => removeTask(index)} hitSlop={10}>
                                            <X size={18} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <View style={styles.resultMeta}>
                                        <View style={styles.metaItem}>
                                            <Calendar size={14} color={colors.textSecondary} />
                                            <Text style={[styles.resultTime, { color: colors.textSecondary }]}>{task.date}</Text>
                                        </View>
                                        <View style={styles.metaItem}>
                                            <Text style={[styles.resultTime, { color: colors.textSecondary }]}>•</Text>
                                            <Text style={[styles.resultTime, { color: colors.textSecondary }]}>{task.time}</Text>
                                        </View>
                                    </View>

                                    {task.reason && (
                                        <View style={[styles.reasonBadge, { backgroundColor: colors.accentOrange + '15' }]}>
                                            <Sparkles size={12} color={colors.accentOrange} style={{ marginRight: 4 }} />
                                            <Text style={[styles.resultReason, { color: colors.accentOrange }]}>{task.reason}</Text>
                                        </View>
                                    )}
                                </View>
                            ))
                        ) : (
                            // Empty State
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIconCircle, { backgroundColor: colors.card }]}>
                                    <Sparkles size={40} color={colors.accentOrange} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>How can I help?</Text>
                                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                                    "Plan a meeting next Tuesday at 2 PM" or scan a flyer to auto-add events.
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer Actions */}
                    {generatedTasks.length > 0 && !isAiLoading ? (
                        <TouchableOpacity onPress={handleAcceptAll} activeOpacity={0.8} style={styles.acceptButton}>
                            <LinearGradient
                                colors={[colors.accentOrange, colors.progressRed]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientBtn}
                            >
                                <Check size={20} color="white" style={{marginRight: 8}} />
                                <Text style={styles.acceptBtnText}>Add {generatedTasks.length} to Schedule</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        // Input Bar
                        !isAiLoading && (
                            <View style={styles.inputContainer}>
                                {selectedImage && (
                                    <View style={[styles.imagePreviewBadge, { borderColor: colors.card }]}>
                                        <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                                        <TouchableOpacity 
                                            style={styles.removeImageBtn}
                                            onPress={() => setSelectedImage(null)}
                                        >
                                            <X size={12} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <TouchableOpacity 
                                        style={styles.iconButton} 
                                        onPress={pickImage}
                                    >
                                        {selectedImage ? (
                                            <ImageIcon size={22} color={colors.accentOrange} />
                                        ) : (
                                            <Plus size={24} color={colors.textSecondary} />
                                        )}
                                    </TouchableOpacity>

                                    <TextInput 
                                        style={[styles.textInput, { color: colors.textPrimary }]}
                                        placeholder={selectedImage ? "Add context (optional)..." : "Type your plan..."}
                                        placeholderTextColor={colors.textSecondary}
                                        value={aiPrompt}
                                        onChangeText={setAiPrompt}
                                        multiline
                                    />

                                    <TouchableOpacity 
                                        onPress={handleAiSubmit}
                                        disabled={!aiPrompt && !selectedImage}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={aiPrompt || selectedImage ? [colors.accentOrange, colors.progressRed] : [colors.border, colors.border]}
                                            style={styles.sendButton}
                                        >
                                            <Send size={18} color="white" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )
                    )}
                </View>
            </KeyboardAvoidingView>

            <CustomAlert 
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={closeAlert}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1 },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    aiKeyboardContainer: { flex: 1, justifyContent: 'flex-end' },
    aiBottomSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 10,
        maxHeight: '85%', 
        minHeight: 250,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 20,
    },
    handleContainer: { alignItems: 'center', marginBottom: 15 },
    handleBar: { width: 40, height: 5, borderRadius: 3, opacity: 0.3 },
    
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    titleWrapper: { flexDirection: 'row', alignItems: 'center' },
    iconBadge: { padding: 8, borderRadius: 12, marginRight: 10 },
    modalTitle: { fontSize: 22, fontWeight: 'bold' },
    closeButton: { padding: 8, borderRadius: 20 },

    contentArea: { maxHeight: 400 },
    centerContent: { flexGrow: 1, justifyContent: 'center' },

    // Empty State
    emptyState: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 30 },
    emptyIconCircle: { 
        width: 80, height: 80, borderRadius: 40, 
        alignItems: 'center', justifyContent: 'center', marginBottom: 15,
        shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 5 
    },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    emptySubtitle: { textAlign: 'center', fontSize: 14, lineHeight: 20 },

    // Loading
    loadingContainer: { alignItems: 'center', padding: 40 },
    loadingText: { marginTop: 15, fontSize: 15, fontWeight: '500' },

    // Result Cards
    resultCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    resultTitle: { fontSize: 17, fontWeight: 'bold', flex: 1, marginRight: 10 },
    resultMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    resultTime: { fontSize: 13, fontWeight: '500' },
    
    reasonBadge: { 
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, marginTop: 10 
    },
    resultReason: { fontSize: 12, fontWeight: '600' },

    // Input Bar
    inputContainer: { paddingTop: 10 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 28,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
    },
    iconButton: { padding: 10 },
    textInput: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    // Image Preview
    imagePreviewBadge: {
        position: 'absolute',
        top: -65,
        left: 10,
        width: 50,
        height: 50,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    previewImage: { width: '100%', height: '100%' },
    removeImageBtn: {
        position: 'absolute',
        top: 0, right: 0, bottom: 0, left: 0,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)'
    },

    // Accept All Button
    acceptButton: { marginTop: 15 },
    gradientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 18,
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    acceptBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default AiAssistantScreen;