import React, { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { deleteDocument } from '@/lib/firestore';
import { deleteUploadedFile } from '@/lib/storage';
import { colors, radius, spacing, typography } from '@/theme';
import { fmtDate } from '@/utils/dates';

export default function DocumentViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { documents, pets } = useData();
  const doc = documents.find(d => d.id === id);
  const pet = doc ? pets.find(p => p.id === doc.petId) : undefined;
  const [busy, setBusy] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  if (!doc) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Document' }} />
        <Ionicons name="document-outline" size={48} color={colors.textFaint} />
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.md }]}>
          This document is no longer available.
        </Text>
      </View>
    );
  }

  const isImage = doc.fileType?.startsWith('image/');
  const isPdf = doc.fileType === 'application/pdf';
  const dark = isImage;

  const shareFileNatively = async () => {
    setBusy(true);
    try {
      // Sharing.shareAsync needs a local file. Download first to the cache.
      const ext = isPdf ? '.pdf' : guessExt(doc.fileType, doc.fileUrl);
      const safeName = doc.title.replace(/[^A-Za-z0-9-_]/g, '_').slice(0, 64) || 'document';
      const localUri = `${FileSystem.cacheDirectory}${safeName}${ext}`;
      const dl = await FileSystem.downloadAsync(doc.fileUrl, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, {
          mimeType: doc.fileType,
          dialogTitle: doc.title,
          UTI: isPdf ? 'com.adobe.pdf' : 'public.image',
        });
      } else {
        Linking.openURL(doc.fileUrl);
      }
    } catch (e: any) {
      Alert.alert('Could not share', e?.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  // Share the download URL as text via the native share sheet. The system
  // sheet includes Copy, Messages, Mail, AirDrop, etc., so we get clipboard
  // + email + text in one call without needing expo-clipboard.
  const shareLink = async () => {
    try {
      await Share.share({
        message: doc.fileUrl,
        title: doc.title,
        url: doc.fileUrl, // iOS uses `url` to render a link preview
      });
    } catch (e: any) {
      Alert.alert('Could not share', e?.message ?? 'Try again.');
    }
  };

  // Opens an iOS action sheet (or Android Alert dialog) with all share options.
  const handleShare = () => {
    const options = ['Share file…', 'Show QR code', 'Share link…', 'Cancel'];
    const cancelIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, title: doc.title },
        idx => {
          if (idx === 0) shareFileNatively();
          else if (idx === 1) setQrVisible(true);
          else if (idx === 2) shareLink();
        },
      );
    } else {
      Alert.alert(doc.title, 'Choose how to share this document', [
        { text: 'Share file…', onPress: shareFileNatively },
        { text: 'Show QR code', onPress: () => setQrVisible(true) },
        { text: 'Share link…', onPress: shareLink },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete document?', `"${doc.title}" will be removed from your records.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;
          try {
            await deleteDocument(user.uid, doc.id);
            // Best-effort: remove the uploaded file too. Firestore is the
            // source of truth; storage cleanup failing doesn't break anything.
            deleteUploadedFile(doc.fileUrl).catch(() => {});
            router.back();
          } catch (e: any) {
            Alert.alert('Could not delete', e?.message ?? 'Try again.');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: dark ? '#000' : colors.bg }}>
      <Stack.Screen
        options={{
          title: doc.title,
          headerStyle: { backgroundColor: dark ? '#000' : colors.bg },
          headerTitleStyle: { color: dark ? '#fff' : colors.text, fontWeight: '700' },
          headerTintColor: dark ? '#fff' : colors.text,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 12, paddingRight: 4 }}>
              <Pressable onPress={handleShare} disabled={busy} hitSlop={10} style={styles.headerBtn}>
                {busy ? (
                  <ActivityIndicator color={dark ? '#fff' : colors.primary} />
                ) : (
                  <Ionicons name="share-outline" size={22} color={dark ? '#fff' : colors.primary} />
                )}
              </Pressable>
              <Pressable onPress={handleDelete} hitSlop={10} style={styles.headerBtn}>
                <Ionicons name="trash-outline" size={22} color={dark ? '#fff' : colors.danger} />
              </Pressable>
            </View>
          ),
        }}
      />

      {isImage ? (
        <Image
          source={{ uri: doc.fileUrl }}
          style={{ flex: 1 }}
          contentFit="contain"
          transition={200}
        />
      ) : (
        <View style={styles.pdfWrap}>
          <View style={styles.pdfIcon}>
            <Ionicons name={isPdf ? 'document-text' : 'document-attach'} size={48} color={colors.primary} />
          </View>
          <Text style={[typography.h2, { textAlign: 'center' }]}>{doc.title}</Text>
          <Text style={[typography.caption, { textAlign: 'center', marginTop: 4 }]}>
            {pet?.name ? `${pet.name} · ` : ''}{fmtDate(doc.createdAt)}{isPdf ? ' · PDF' : ''}
          </Text>
          <Pressable
            onPress={() => Linking.openURL(doc.fileUrl)}
            style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={styles.openBtnText}>{isPdf ? 'Open PDF' : 'Open file'}</Text>
          </Pressable>
        </View>
      )}

      {doc.ocrText ? (
        <View style={[styles.ocrCard, dark && { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
          <Text style={styles.ocrLabel}>Detected text</Text>
          <Text style={styles.ocrText} numberOfLines={4}>{doc.ocrText}</Text>
        </View>
      ) : null}

      <QrShareModal
        visible={qrVisible}
        url={doc.fileUrl}
        title={doc.title}
        petName={pet?.name}
        onClose={() => setQrVisible(false)}
        onShareLink={shareLink}
      />
    </View>
  );
}

function QrShareModal({
  visible, url, title, petName, onClose, onShareLink,
}: {
  visible: boolean;
  url: string;
  title: string;
  petName?: string;
  onClose: () => void;
  onShareLink: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.qrBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.qrCard}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.qrClose}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.qrTitle}>Scan to receive</Text>
          <Text style={styles.qrSub} numberOfLines={2}>{title}</Text>
          {petName ? <Text style={styles.qrPet}>{petName}</Text> : null}

          <View style={styles.qrWrap}>
            <QRCode
              value={url}
              size={220}
              color={colors.text}
              backgroundColor="#fff"
              ecl="M"
            />
          </View>

          <Text style={styles.qrHint}>
            Point any iPhone/Android camera at the code. The recipient gets a tap-to-open download link, no app required.
          </Text>

          <Pressable
            onPress={onShareLink}
            style={({ pressed }) => [styles.qrCopyBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="share-outline" size={16} color={colors.primary} />
            <Text style={styles.qrCopyText}>Share link instead</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function guessExt(mime: string | undefined, url: string): string {
  if (mime?.includes('png')) return '.png';
  if (mime?.includes('jpeg') || mime?.includes('jpg')) return '.jpg';
  if (mime?.includes('webp')) return '.webp';
  if (mime?.includes('heic')) return '.heic';
  if (mime?.includes('pdf')) return '.pdf';
  // Fall back to URL extension if obvious.
  const m = url.match(/\.([a-zA-Z0-9]{2,5})(\?|$)/);
  return m ? `.${m[1].toLowerCase()}` : '';
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.lg },
  headerBtn: { padding: 4 },
  pdfWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  pdfIcon: {
    width: 96, height: 96, borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  openBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  openBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  ocrCard: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    bottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ocrLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  ocrText: { fontSize: 12, color: colors.text, lineHeight: 16 },

  qrBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  qrCard: {
    backgroundColor: colors.bg,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  qrClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted, textTransform: 'uppercase' },
  qrSub: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 4 },
  qrPet: { fontSize: 13, color: colors.textMuted, marginTop: -2 },
  qrWrap: {
    marginVertical: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
  },
  qrHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: spacing.sm,
  },
  qrCopyBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  qrCopyText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
});
