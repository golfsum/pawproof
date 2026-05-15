import React, { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing } from '@/theme';

interface Props {
  value: string | null | undefined;
  onChange: (uri: string | null) => void;
  shape?: 'circle' | 'square';
  size?: number;
  label?: string;
  loading?: boolean;
}

export function PhotoPicker({ value, onChange, shape = 'circle', size = 110, label = 'Photo', loading }: Props) {
  const [working, setWorking] = useState(false);
  const busy = working || !!loading;

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos permission required', 'Enable photo access in Settings to attach a picture.');
      return;
    }
    setWorking(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
        aspect: shape === 'circle' ? [1, 1] : undefined,
      });
      if (!res.canceled && res.assets[0]) onChange(res.assets[0].uri);
    } finally {
      setWorking(false);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera permission required', 'Enable camera access in Settings to take a picture.');
      return;
    }
    setWorking(true);
    try {
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
        aspect: shape === 'circle' ? [1, 1] : undefined,
      });
      if (!res.canceled && res.assets[0]) onChange(res.assets[0].uri);
    } finally {
      setWorking(false);
    }
  };

  const onPress = () => {
    const removeOpt = value ? ['Remove photo'] : [];
    const options = ['Take photo', 'Choose from library', ...removeOpt, 'Cancel'];
    const cancelButtonIndex = options.length - 1;
    const destructiveIndex = value ? 2 : -1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined },
        idx => {
          if (idx === 0) pickFromCamera();
          else if (idx === 1) pickFromLibrary();
          else if (idx === destructiveIndex && destructiveIndex >= 0) onChange(null);
        },
      );
    } else {
      Alert.alert(label, undefined, [
        { text: 'Take photo', onPress: pickFromCamera },
        { text: 'Choose from library', onPress: pickFromLibrary },
        ...(value ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => onChange(null) }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const borderRadius = shape === 'circle' ? size / 2 : radius.lg;
  const dim = { width: size, height: size, borderRadius };

  return (
    <View style={styles.wrap}>
      {/* Outer clip View — Pressable's overflow:hidden is unreliable across
          RN versions, so a wrapper View enforces the circle clip. */}
      <View style={[styles.clip, dim]}>
        <Pressable
          onPress={onPress}
          disabled={busy}
          style={({ pressed }) => [styles.target, dim, pressed && { opacity: 0.85 }]}
        >
          {value ? (
            <Image source={{ uri: value }} style={dim} contentFit="cover" />
          ) : (
            <View style={[styles.empty, dim]}>
              <Ionicons name="camera-outline" size={26} color={colors.primary} />
            </View>
          )}
          {busy ? (
            <View style={[styles.busy, dim]}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : null}
        </Pressable>
      </View>
      <Text style={styles.caption}>{value ? 'Tap to change' : label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  clip: { overflow: 'hidden', backgroundColor: colors.cardSubtle },
  target: {
    backgroundColor: colors.cardSubtle,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  busy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { fontSize: 12, color: colors.textMuted },
});
