import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Animated } from 'react-native';
import { MapPin, Clock, Calendar, Check, Edit2, Trash2, X, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const getCategoryColor = (type) => {
  switch (type) {
    case 'Task': return '#FFC72C'; // Yellow
    case 'Class': return '#FF9500'; // Orange
    case 'Routine': return '#00BFFF'; // Blue
    case 'Meeting': return '#4CAF50'; // Green
    case 'Work': return '#5F50A9'; // Purple
    default: return '#9CA3AF'; // Gray
  }
};

// UPDATED: Added 'userId' to props destructuring
export const TaskCard = ({ id, userId, type, title, description, time, location, date, deadline, status, onDone, onEdit, onDelete }) => {
  const { colors } = useTheme();
  const [remainingTime, setRemainingTime] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isPastDeadline, setIsPastDeadline] = useState(false);
  
  // Animation for actions view
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (isEditing) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isEditing]);

  useEffect(() => {
    const calculateRemainingTime = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diff = deadlineDate - now;

      if (diff <= 0) {
        setIsPastDeadline(true);
        if (type === 'Task') {
          setRemainingTime('Missed');
        }
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setRemainingTime(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setRemainingTime(`${hours}h ${minutes}m left`);
      } else if (minutes > 0) {
        setRemainingTime(`${minutes}m left`);
      } else {
        setRemainingTime(`Now`);
      }
    };

    if (status !== 'done' && !isPastDeadline) {
      calculateRemainingTime(); // Initial call
      const interval = setInterval(calculateRemainingTime, 60000); // Update every minute is usually enough
      return () => clearInterval(interval);
    }
  }, [deadline, status, isPastDeadline, type]);

  const handleLongPress = () => {
    setIsEditing(prev => !prev);
  };

  const handleAction = (action) => {
    // Small delay to allow ripple/press effect
    setTimeout(() => {
        if (action === 'done') onDone(id);
        // UPDATED: Passed 'userId' in the object below
        if (action === 'edit') onEdit({ id, userId, type, title, description, time, location, date, deadline, status });
        
        // UPDATED: Pass 'type' as the second argument
        if (action === 'delete') onDelete && onDelete(id, type);
        setIsEditing(false);
    }, 100);
  };

  const categoryColor = getCategoryColor(type);

  return (
    <Pressable 
      onLongPress={handleLongPress} 
      onPress={() => isEditing && setIsEditing(false)} 
      delayLongPress={300}
      style={({ pressed }) => [
        styles.container, 
        { 
            backgroundColor: colors.card, 
            shadowColor: colors.shadow || '#000',
            transform: [{ scale: pressed ? 0.98 : 1 }]
        }
      ]}
    >
      {/* Main Content */}
      <View style={[styles.content, isEditing && { opacity: 0.3 }]}>
        
        {/* Header: Tag & Location */}
        <View style={styles.headerRow}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
                <Text style={[styles.categoryText, { color: categoryColor }]}>{type}</Text>
            </View>
            
            {location ? (
                <View style={styles.locationContainer}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {location}
                    </Text>
                </View>
            ) : null}
        </View>

        {/* Body: Title & Desc */}
        <View style={styles.body}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>{title}</Text>
            {description ? (
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                    {description}
                </Text>
            ) : null}
        </View>

        {/* Footer: Date/Time & Status */}
        <View style={styles.footer}>
            <View style={styles.dateTimeWrapper}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>{date}</Text>
                <View style={[styles.dotSeparator, { backgroundColor: colors.textSecondary }]} />
                <Clock size={14} color={colors.textSecondary} />
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>{time}</Text>
            </View>

            {status === 'done' ? (
                <View style={[styles.statusBadge, { backgroundColor: colors.greenAccent + '20' }]}>
                    <Text style={[styles.statusText, { color: colors.greenAccent }]}>Done</Text>
                </View>
            ) : isPastDeadline && type !== 'Task' ? (
                 <View style={[styles.statusBadge, { backgroundColor: colors.greenAccent + '20' }]}>
                    <Text style={[styles.statusText, { color: colors.greenAccent }]}>Done</Text>
                </View>
            ) : (
                <View style={[
                    styles.statusBadge, 
                    { backgroundColor: remainingTime === 'Missed' ? colors.cancelRed + '20' : colors.accentOrange + '20' }
                ]}>
                    <Text style={[
                        styles.statusText, 
                        { color: remainingTime === 'Missed' ? colors.cancelRed : colors.accentOrange }
                    ]}>
                        {remainingTime}
                    </Text>
                </View>
            )}
        </View>
      </View>

      {/* Action Overlay (Visible on Long Press) */}
      {isEditing && (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <View style={styles.actionsRow}>
                {type === 'Task' && status !== 'done' && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.greenAccent }]} onPress={() => handleAction('done')}>
                        <Check size={22} color="#FFF" />
                        <Text style={styles.actionLabel}>Done</Text>
                    </TouchableOpacity>
                )}
                
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.accentOrange }]} onPress={() => handleAction('edit')}>
                    <Edit2 size={22} color="#FFF" />
                    <Text style={styles.actionLabel}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.cancelRed }]} onPress={() => handleAction('delete')}>
                    <Trash2 size={22} color="#FFF" />
                    <Text style={styles.actionLabel}>Delete</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2, // Android shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6, // Softer iOS shadow
    position: 'relative',
    overflow: 'hidden', // Ensures actions don't spill out
  },
  content: {
    padding: 16,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  locationText: {
    fontSize: 13,
    marginLeft: 4,
  },
  // Body
  body: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  dateTimeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Edit Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.95)', // Slightly translucent background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  actionBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  actionLabel: {
    position: 'absolute',
    bottom: -20,
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
  },
});