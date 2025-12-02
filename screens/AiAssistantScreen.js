import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, TextInput, 
    ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard,
    Image, ScrollView, Alert
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker'; 
import { getUpcomingTasks, addTask } from '../services/Database';
import { scheduleTaskNotification } from '../services/NotificationService';
import { getScheduleRecommendation } from '../services/AiServices';
import { Wand2, X, Send, Plus, Calendar, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AiAssistantScreen = ({ navigation, route }) => {
    const { user } = route.params;
    const { colors } = useTheme();
    const db = useSQLiteContext();
    const insets = useSafeAreaInsets();

    const [aiPrompt, setAiPrompt] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [generatedTasks, setGeneratedTasks] = useState([]); 
    const [isAiLoading, setIsAiLoading] = useState(false);

    // --- Image Picker ---
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5, // Lower quality for faster AI processing
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
            
            // Pass text AND image base64
            const recommendations = await getScheduleRecommendation(
                allUpcomingTasks.slice(0, 20), 
                aiPrompt,
                selectedImage?.base64
            );
            
            setGeneratedTasks(recommendations);
        } catch (error) {
            console.error("AI generation failed:", error);
            Alert.alert("Error", "Failed to generate schedule. Please try again.");
        } finally {
            setIsAiLoading(false);
        }
    };

    // --- Bulk Add Logic ---
    const handleAcceptAll = async () => {
        try {
            for (const task of generatedTasks) {
                // Schedule Notification
                const notifId = await scheduleTaskNotification(task.title, task.date, task.time, 5, task.type);
                
                // Add to DB
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
            Alert.alert("Success", `${generatedTasks.length} items added to your schedule!`, [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Could not save tasks.");
        }
    };

    const handleClose = () => {
        navigation.goBack();
    };

    // Remove single item from review list
    const removeTask = (index) => {
        const newTasks = [...generatedTasks];
        newTasks.splice(index, 1);
        setGeneratedTasks(newTasks);
    };

    return (
        <View style={styles.modalOverlay}>
            <TouchableOpacity 
                style={styles.modalBackdrop} 
                activeOpacity={1} 
                onPress={handleClose} 
            />
            
            <KeyboardAvoidingView 
                // FIX: Use 'padding' for both platforms to force push-up behavior
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                style={styles.aiKeyboardContainer}
                pointerEvents="box-none"
                // FIX: Add offset to ensure it clears any bottom bars/navigation
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} 
            >
                <View style={[styles.aiBottomSheet, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) }]}>
                    
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={styles.titleWrapper}>
                            <Wand2 size={20} color={colors.accentOrange} style={{marginRight:8}} />
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                                {generatedTasks.length > 0 ? "Review Plan" : "Smart Assistant"}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClose}>
                            <X size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Content: Either Loading, Results List, or Empty Space */}
                    <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
                        
                        {isAiLoading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.accentOrange} />
                                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                                    {selectedImage ? "Scanning image..." : "Thinking..."}
                                </Text>
                            </View>
                        )}

                        {/* Generated Results List */}
                        {!isAiLoading && generatedTasks.map((task, index) => (
                            <View key={index} style={[styles.resultCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <View style={styles.resultHeader}>
                                    <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{task.title}</Text>
                                    <TouchableOpacity onPress={() => removeTask(index)}>
                                        <X size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={[styles.resultTime, { color: colors.textSecondary }]}>
                                    <Calendar size={14} color={colors.textSecondary} /> {task.date} at {task.time}
                                </Text>
                                <Text style={[styles.resultReason, { color: colors.accentOrange }]}>{task.reason}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Actions if tasks generated */}
                    {generatedTasks.length > 0 && !isAiLoading && (
                        <TouchableOpacity onPress={handleAcceptAll} style={styles.acceptButton}>
                            <LinearGradient
                                colors={[colors.accentOrange, colors.progressRed]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientBtn}
                            >
                                <Check size={20} color="white" style={{marginRight: 8}} />
                                <Text style={styles.acceptBtnText}>Add All ({generatedTasks.length})</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Input Bar (Hidden if viewing results to keep it clean) */}
                    {generatedTasks.length === 0 && !isAiLoading && (
                        <View style={styles.inputContainer}>
                            
                            {/* Image Preview Badge */}
                            {selectedImage && (
                                <View style={styles.imagePreviewBadge}>
                                    <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                                    <TouchableOpacity 
                                        style={styles.removeImageBtn}
                                        onPress={() => setSelectedImage(null)}
                                    >
                                        <X size={12} color="white" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground }]}>
                                <TouchableOpacity 
                                    style={styles.iconButton} 
                                    onPress={pickImage}
                                >
                                    <Plus size={24} color={colors.textSecondary} />
                                </TouchableOpacity>

                                <TextInput 
                                    style={[styles.textInput, { color: colors.textPrimary }]}
                                    placeholder={selectedImage ? "What should I schedule from this?" : "Type or scan a schedule..."}
                                    placeholderTextColor={colors.textSecondary}
                                    value={aiPrompt}
                                    onChangeText={setAiPrompt}
                                    multiline
                                />

                                <TouchableOpacity 
                                    style={[styles.sendButton, { backgroundColor: aiPrompt || selectedImage ? colors.accentOrange : colors.border }]} 
                                    onPress={handleAiSubmit}
                                    disabled={!aiPrompt && !selectedImage}
                                >
                                    <Send size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1 },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    aiKeyboardContainer: { flex: 1, justifyContent: 'flex-end' },
    aiBottomSheet: {
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingHorizontal: 20,
        paddingTop: 20,
        maxHeight: '85%', // Prevent taking full screen
        minHeight: 200,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    titleWrapper: { flexDirection: 'row', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    
    contentArea: { maxHeight: 400 },
    
    // Loading
    loadingContainer: { alignItems: 'center', padding: 30 },
    loadingText: { marginTop: 10, fontSize: 14 },

    // Result Cards
    resultCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
    },
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    resultTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 10 },
    resultTime: { fontSize: 14, marginTop: 4 },
    resultReason: { fontSize: 12, marginTop: 8, fontStyle: 'italic' },

    // Input Bar Area
    inputContainer: { marginTop: 10 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 25,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    iconButton: { padding: 8 },
    textInput: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingHorizontal: 10,
        paddingVertical: 5, 
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    // Image Preview
    imagePreviewBadge: {
        position: 'absolute',
        top: -70,
        left: 0,
        width: 60,
        height: 60,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'white',
        elevation: 5,
    },
    previewImage: { width: '100%', height: '100%' },
    removeImageBtn: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        padding: 2,
    },

    // Accept All Button
    acceptButton: { marginTop: 15 },
    gradientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
    },
    acceptBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default AiAssistantScreen;