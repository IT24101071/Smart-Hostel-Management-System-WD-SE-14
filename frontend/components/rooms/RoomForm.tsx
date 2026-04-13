import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { AvailabilityStatus, RoomFormValues, RoomType } from '../../types/room';

const MAX_IMAGES = 5;

const ROOM_TYPES: RoomType[] = ['Single', 'Double', 'Triple'];
const AVAILABILITY_OPTIONS: AvailabilityStatus[] = ['Available', 'Full', 'Maintenance'];

const STATUS_CONFIG: Record<
  AvailabilityStatus,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  Available: { icon: 'checkmark-circle-outline', color: COLORS.available, bg: COLORS.availableBg },
  Full: { icon: 'people-outline', color: COLORS.full, bg: COLORS.fullBg },
  Maintenance: { icon: 'construct-outline', color: COLORS.maintenance, bg: COLORS.maintenanceBg },
};

const DEFAULT_VALUES: RoomFormValues = {
  roomNumber: '',
  roomType: 'Single',
  pricePerMonth: '',
  capacity: 1,
  description: '',
  availabilityStatus: 'Available',
  imageUris: [],
};

type RoomFormProps = {
  initialValues?: Partial<RoomFormValues>;
  submitLabel: string;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: RoomFormValues) => void;
};

export default function RoomForm({
  initialValues,
  submitLabel,
  submitting = false,
  onCancel,
  onSubmit,
}: RoomFormProps) {
  const seed = { ...DEFAULT_VALUES, ...initialValues };

  const [roomNumber, setRoomNumber] = useState(seed.roomNumber);
  const [roomType, setRoomType] = useState<RoomType>(seed.roomType);
  const [pricePerMonth, setPricePerMonth] = useState(seed.pricePerMonth);
  const [capacity, setCapacity] = useState(seed.capacity);
  const [description, setDescription] = useState(seed.description);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(seed.availabilityStatus);
  const [imageUris, setImageUris] = useState<string[]>(seed.imageUris ?? []);

  async function pickImage(source: 'library' | 'camera') {
    // On web: permissions are not required and allowsEditing is unsupported
    if (Platform.OS !== 'web') {
      const permResult =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permResult.granted) {
        Alert.alert(
          'Permission required',
          source === 'camera'
            ? 'Camera access is needed to take a photo.'
            : 'Photo library access is needed to pick an image.'
        );
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: 'images',
      // allowsEditing crashes the web file-picker flow; skip it on web
      allowsEditing: Platform.OS !== 'web',
      quality: 0.8,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets[0]) {
      setImageUris((prev) => [...prev, result.assets[0].uri]);
    }
  }

  function showPickerOptions() {
    // On web the file-picker must be opened synchronously inside the tap handler.
    // Showing an Alert first breaks the browser's user-gesture requirement.
    if (Platform.OS === 'web') {
      pickImage('library');
      return;
    }

    Alert.alert('Add Image', 'Choose a source', [
      { text: 'Camera', onPress: () => pickImage('camera') },
      { text: 'Photo Library', onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function removeImage(index: number) {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!roomNumber.trim()) {
      Alert.alert('Validation Error', 'Room number is required.');
      return;
    }
    if (!pricePerMonth.trim() || isNaN(Number(pricePerMonth)) || Number(pricePerMonth) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price per month.');
      return;
    }
    onSubmit({ roomNumber, roomType, pricePerMonth, capacity, description, availabilityStatus, imageUris });
  }

  return (
    <View style={styles.container}>
      {/* Room Identity */}
      <SectionCard title="Room Identity" icon="home-outline">
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            Room Number <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. A-101"
            placeholderTextColor="#9CA3AF"
            value={roomNumber}
            onChangeText={setRoomNumber}
            autoCapitalize="characters"
          />
          <Text style={styles.fieldHint}>Must be unique across all rooms.</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            Room Type <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.segmentedControl}>
            {ROOM_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[styles.segmentItem, roomType === type && styles.segmentItemActive]}
                onPress={() => setRoomType(type)}
              >
                <Text style={[styles.segmentText, roomType === type && styles.segmentTextActive]}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SectionCard>

      {/* Pricing & Capacity */}
      <SectionCard title="Pricing & Capacity" icon="cash-outline">
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            Price Per Month (Rs.) <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.prefixInputWrapper}>
            <Text style={styles.prefixText}>Rs.</Text>
            <TextInput
              style={styles.prefixInput}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={pricePerMonth}
              onChangeText={setPricePerMonth}
            />
          </View>
          <Text style={styles.fieldHint}>Minimum value must be greater than 0.</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            Capacity <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.stepperRow}>
            <Pressable
              style={[styles.stepperBtn, capacity <= 1 && styles.stepperBtnDisabled]}
              onPress={() => setCapacity((c) => Math.max(1, c - 1))}
              disabled={capacity <= 1}
            >
              <Ionicons name="remove" size={20} color={capacity <= 1 ? '#D1D5DB' : COLORS.primary} />
            </Pressable>
            <View style={styles.stepperValue}>
              <Text style={styles.stepperValueText}>{capacity}</Text>
              <Text style={styles.stepperValueLabel}>{capacity === 1 ? 'person' : 'persons'}</Text>
            </View>
            <Pressable style={styles.stepperBtn} onPress={() => setCapacity((c) => c + 1)}>
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </Pressable>
          </View>
          <Text style={styles.fieldHint}>Minimum capacity is 1.</Text>
        </View>
      </SectionCard>

      {/* Availability Status */}
      <SectionCard title="Availability Status" icon="information-circle-outline">
        <View style={styles.statusOptions}>
          {AVAILABILITY_OPTIONS.map((status) => {
            const config = STATUS_CONFIG[status];
            const isSelected = availabilityStatus === status;
            return (
              <Pressable
                key={status}
                style={[
                  styles.statusOption,
                  isSelected && { backgroundColor: config.bg, borderColor: config.color },
                ]}
                onPress={() => setAvailabilityStatus(status)}
              >
                <View style={[styles.statusOptionIcon, { backgroundColor: config.bg }]}>
                  <Ionicons name={config.icon} size={18} color={config.color} />
                </View>
                <Text
                  style={[
                    styles.statusOptionText,
                    isSelected && { color: config.color, fontFamily: 'PublicSans_600SemiBold' },
                  ]}
                >
                  {status}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={config.color}
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      {/* Description */}
      <SectionCard title="Description" icon="document-text-outline">
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Room Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Enter a brief description of the room (amenities, location, notes, etc.)"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
          <Text style={styles.fieldHint}>Optional — visible to students.</Text>
        </View>
      </SectionCard>

      {/* Images */}
      <SectionCard title="Room Images" icon="images-outline">
        <Text style={styles.fieldLabel}>Upload Images</Text>
        <Text style={styles.imageHint}>
          Up to {MAX_IMAGES} images · JPEG, PNG, WebP · max 5 MB each
        </Text>
        <View style={styles.imageSlots}>
          {/* Filled slots — show thumbnail + remove button */}
          {imageUris.map((uri, i) => (
            <View key={`filled-${i}`} style={styles.imageSlot}>
              <Image source={{ uri }} style={styles.imageThumbnail} resizeMode="cover" />
              <Pressable style={styles.removeBtn} onPress={() => removeImage(i)} hitSlop={6}>
                <Ionicons name="close-circle" size={20} color={COLORS.maintenance} />
              </Pressable>
            </View>
          ))}

          {/* Empty add slot — only show if under the limit */}
          {imageUris.length < MAX_IMAGES && (
            <Pressable style={styles.imageSlot} onPress={showPickerOptions}>
              <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
              <Text style={styles.imageSlotText}>Add Photo</Text>
            </Pressable>
          )}
        </View>
        {imageUris.length > 0 && (
          <Text style={styles.imageCountHint}>
            {imageUris.length} / {MAX_IMAGES} image{imageUris.length !== 1 ? 's' : ''} selected
          </Text>
        )}
      </SectionCard>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable style={styles.cancelButton} onPress={onCancel} disabled={submitting}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && !submitting && styles.saveButtonPressed,
            submitting && styles.saveButtonLoading,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="checkmark" size={18} color={COLORS.white} />
          )}
          <Text style={styles.saveButtonText}>{submitLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBox}>
          <Ionicons name={icon} size={16} color={COLORS.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },

  // Section card
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  // Fields
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  required: {
    color: COLORS.maintenance,
  },
  fieldHint: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: COLORS.textPrimary,
    height: 48,
  },
  textArea: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 96,
  },

  // Prefix input
  prefixInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    height: 48,
    overflow: 'hidden',
  },
  prefixText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 14,
    color: COLORS.textMuted,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    height: '100%',
    textAlignVertical: 'center',
    lineHeight: 48,
  },
  prefixInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontFamily: 'PublicSans_400Regular',
    fontSize: 14,
    color: COLORS.textPrimary,
    height: '100%',
  },

  // Segmented control
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 13.5,
    color: COLORS.textMuted,
  },
  segmentTextActive: {
    color: COLORS.white,
    fontFamily: 'PublicSans_600SemiBold',
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  stepperBtnDisabled: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  stepperValue: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 8,
  },
  stepperValueText: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  stepperValueLabel: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // Status options
  statusOptions: {
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
  },
  statusOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Image slots
  imageHint: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginBottom: 12,
    marginTop: -4,
  },
  imageSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageSlot: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  imageSlotText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 10,
    color: COLORS.primary,
  },
  imageCountHint: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: 8,
  },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  cancelButtonText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  saveButtonLoading: {
    opacity: 0.75,
  },
  saveButtonText: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 15,
    color: COLORS.white,
  },
});
