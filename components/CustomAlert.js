import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, type = 'info', buttons, onClose }) => {
    const { colors } = useTheme();
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start(() => scaleAnim.setValue(0.8));
        }
    }, [visible]);

    if (!visible) return null;

    // Icon helper
    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle2 size={40} color={colors.greenAccent} />;
            case 'error': return <AlertCircle size={40} color={colors.cancelRed} />;
            default: return <Info size={40} color={colors.accentOrange} />;
        }
    };

    // Header Color helper (Used for icon background)
    const getHeaderColor = () => {
        switch (type) {
            case 'success': return colors.greenAccent;
            case 'error': return colors.cancelRed;
            default: return colors.accentOrange;
        }
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View 
                    style={[
                        styles.alertContainer, 
                        { 
                            backgroundColor: colors.card, 
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }],
                            shadowColor: '#000', 
                        }
                    ]}
                >
                    {/* Decorative Top Line REMOVED */}

                    <View style={styles.content}>
                        <View style={[styles.iconWrapper, { backgroundColor: getHeaderColor() + '15' }]}>
                            {getIcon()}
                        </View>

                        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
                        
                        <View style={styles.buttonContainer}>
                            {buttons && buttons.length > 0 ? (
                                buttons.map((btn, index) => {
                                    const isPrimary = btn.style !== 'cancel';
                                    return (
                                        <TouchableOpacity 
                                            key={index} 
                                            activeOpacity={0.8}
                                            style={styles.buttonWrapper}
                                            onPress={() => {
                                                if (btn.onPress) btn.onPress();
                                                else onClose();
                                            }}
                                        >
                                            {isPrimary ? (
                                                <LinearGradient
                                                    colors={btn.style === 'destructive' ? [colors.cancelRed, '#FF6B6B'] : [colors.accentOrange, colors.progressRed]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.gradientButton}
                                                >
                                                    <Text style={[styles.buttonText, { color: '#fff' }]}>{btn.text}</Text>
                                                </LinearGradient>
                                            ) : (
                                                <View style={[styles.outlineButton, { borderColor: colors.border }]}>
                                                    <Text style={[styles.buttonText, { color: colors.textSecondary }]}>{btn.text}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })
                            ) : (
                                // Default OK button
                                <TouchableOpacity 
                                    activeOpacity={0.8}
                                    style={styles.buttonWrapper}
                                    onPress={onClose}
                                >
                                    <LinearGradient
                                        colors={[colors.accentOrange, colors.progressRed]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientButton}
                                    >
                                        <Text style={[styles.buttonText, { color: '#fff' }]}>OK</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)', 
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertContainer: {
        width: width * 0.85,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 20,
        // iOS Shadow
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
    },
    // topAccent style removed
    content: {
        padding: 24,
        alignItems: 'center',
    },
    iconWrapper: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        gap: 12,
        flexWrap: 'wrap',
    },
    buttonWrapper: {
        flex: 1,
        minWidth: 100,
    },
    gradientButton: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    outlineButton: {
        borderRadius: 14,
        paddingVertical: 13, 
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    }
});

export default CustomAlert;