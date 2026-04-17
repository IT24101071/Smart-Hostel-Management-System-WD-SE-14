import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../../../constants/colors';

const MAX_BYTES = 5 * 1024 * 1024;

function pickImageFlow() {
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
  });
}

export default function ReceiptUploadZone({ receipt, onReceiptChange }) {
  const applyAsset = useCallback(
    (asset) => {
      if (!asset?.uri) return;
      const size = asset.fileSize ?? asset.size;
      if (typeof size === 'number' && size > MAX_BYTES) {
        Alert.alert('File too large', 'Please choose a file under 5 MB.');
        return;
      }
      onReceiptChange({
        uri: asset.uri,
        name: asset.name || asset.fileName || 'receipt',
        mimeType: asset.mimeType || asset.type || 'image/jpeg',
        size,
      });
    },
    [onReceiptChange],
  );

  const pickPdf = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const file = res.assets[0];
    const { uri, name, size, mimeType } = file;
    if (typeof size === 'number' && size > MAX_BYTES) {
      Alert.alert('File too large', 'Please choose a file under 5 MB.');
      return;
    }
    onReceiptChange({
      uri,
      name: name || 'receipt.pdf',
      mimeType: mimeType || 'application/pdf',
      size,
    });
  }, [onReceiptChange]);

  const pickDocumentWeb = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const file = res.assets[0];
    const size = file.size;
    if (typeof size === 'number' && size > MAX_BYTES) {
      Alert.alert('File too large', 'Please choose a file under 5 MB.');
      return;
    }
    onReceiptChange({
      uri: file.uri,
      name: file.name || 'receipt',
      mimeType: file.mimeType || 'application/octet-stream',
      size,
    });
  }, [onReceiptChange]);

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a receipt.');
      return;
    }
    const result = await pickImageFlow();
    if (result.canceled || !result.assets?.[0]) return;
    applyAsset(result.assets[0]);
  }, [applyAsset]);

  const openChooser = useCallback(() => {
    const buttons = [
      {
        text: 'Photo library',
        onPress: () => {
          pickPhoto();
        },
      },
      {
        text: 'PDF file',
        onPress: () => {
          pickPdf();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ];
    if (receipt) {
      buttons.unshift({
        text: 'Remove file',
        style: 'destructive',
        onPress: () => onReceiptChange(null),
      });
    }
    Alert.alert('Upload receipt', 'Choose a source', buttons, {
      cancelable: true,
    });
  }, [pickPhoto, pickPdf, receipt, onReceiptChange]);

  const onPressZone = useCallback(() => {
    if (Platform.OS === 'web') {
      pickDocumentWeb();
      return;
    }
    openChooser();
  }, [openChooser, pickDocumentWeb]);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Upload Receipt</Text>
      <Pressable
        style={styles.zone}
        onPress={onPressZone}
        accessibilityRole="button"
        accessibilityLabel="Tap to upload receipt"
      >
        <Ionicons name="cloud-upload-outline" size={40} color={COLORS.primary} />
        <Text style={styles.zoneTitle}>Tap To Upload Receipt</Text>
        <Text style={styles.zoneHint}>JPG, PNG, PDF (Max 5MB)</Text>
        {receipt?.name ? (
          <Text style={styles.fileName} numberOfLines={1}>
            {receipt.name}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  heading: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  zone: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  zoneTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 15,
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  zoneHint: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  fileName: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 10,
    maxWidth: '100%',
  },
});
