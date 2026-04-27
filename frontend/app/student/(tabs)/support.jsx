import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';
import { getMyLatestBooking } from '../../../services/booking.service';
import { createTicket, getMyTickets, getTicketErrorMessage } from '../../../services/ticket.service';
import {
  CATEGORY_ICONS,
  TICKET_CATEGORIES,
  TICKET_STATUS_COLORS,
  TICKET_URGENCY_LEVELS,
} from '../../../types/ticket';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TICKET_IMAGES = 5;

export default function StudentSupportScreen() {
  const insets = useSafeAreaInsets();
  const { focus } = useLocalSearchParams();
  const router = useRouter();
  const scrollRef = useRef(null);
  const hasAutoScrolledToHistoryRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [latestBooking, setLatestBooking] = useState(null);
  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [urgency, setUrgency] = useState("Medium");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [submitMessage, setSubmitMessage] = useState(null);
  const [showFieldValidation, setShowFieldValidation] = useState(false);
  const [historySectionY, setHistorySectionY] = useState(0);
  const subjectLength = subject.trim().length;
  const descriptionLength = description.trim().length;
  const canSubmit =
    subjectLength >= 5 && descriptionLength >= 10 && !submitting;

  useEffect(() => {
    let mounted = true;

    const fetchStay = async () => {
      try {
        setLoading(true);
        const booking = await getMyLatestBooking();
        if (mounted) setLatestBooking(booking);
        const tickets = await getMyTickets();
        if (mounted) setMyTickets(tickets);
      } catch (error) {
        if (mounted) Alert.alert("Support", getTicketErrorMessage(error));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStay();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (showFieldValidation && subjectLength >= 5 && descriptionLength >= 10) {
      setShowFieldValidation(false);
    }
  }, [showFieldValidation, subjectLength, descriptionLength]);

  useEffect(() => {
    hasAutoScrolledToHistoryRef.current = false;
  }, [focus]);

  useEffect(() => {
    if (focus !== 'history') return;
    if (loading) return;
    if (historySectionY <= 0) return;
    if (hasAutoScrolledToHistoryRef.current) return;
    hasAutoScrolledToHistoryRef.current = true;
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, historySectionY - 12),
        animated: true,
      });
    }, 120);
  }, [focus, loading, historySectionY]);

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to attach an image.");
      return;
    }
    if (images.length >= MAX_TICKET_IMAGES) {
      Alert.alert("Limit reached", "Maximum 5 images are allowed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: MAX_TICKET_IMAGES,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    const nextImages = [...images];
    for (const asset of result.assets) {
      if (nextImages.length >= MAX_TICKET_IMAGES) break;
      const size = asset.fileSize ?? asset.size;
      if (typeof size === "number" && size > MAX_IMAGE_BYTES) {
        continue;
      }
      nextImages.push({
        uri: asset.uri,
        name: asset.fileName || asset.name || `ticket-image-${nextImages.length + 1}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        size,
      });
    }

    if (nextImages.length === images.length) {
      Alert.alert("Image too large", "Each image must be smaller than 5MB.");
      return;
    }
    setImages(nextImages);
  };

  const submitTicket = async () => {
    if (subjectLength < 5 || descriptionLength < 10) {
      setShowFieldValidation(true);
      setSubmitMessage(null);
      return;
    }
    if (submitting) return;
    try {
      setSubmitting(true);
      setShowFieldValidation(false);
      setSubmitMessage(null);
      await createTicket({
        category,
        subject,
        description,
        urgency,
        images,
      });
      setSubject("");
      setDescription("");
      setUrgency("Medium");
      setCategory(TICKET_CATEGORIES[0]);
      setImages([]);
      const tickets = await getMyTickets();
      setMyTickets(tickets);
      setSubmitMessage({
        type: "success",
        text: "Ticket submitted successfully. Scroll down to see it in My Recent Tickets.",
      });
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } catch (error) {
      setSubmitMessage(null);
      Alert.alert("Unable to submit", getTicketErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const removeImageAt = (indexToRemove) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/student");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.mutedText}>Loading support desk...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.headerBtn}
          onPress={handleBack}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Support Desk</Text>
        <View style={styles.headerBtn} />
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["#204F95", "#0A192F"]}
          locations={[0.351, 0.7115]}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.stayCard}
        >
          <View style={styles.stayBadge}>
            <View style={styles.stayBadgeDot} />
            <Text style={styles.stayLabel}>Current Stay</Text>
          </View>
          <Text style={styles.stayValue}>
            {latestBooking?.room?.roomNumber
              ? `Reporting Room : Room No ${latestBooking.room.roomNumber}`
              : "Reporting Room : Room Not Assigned"}
          </Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>What&apos;s The Issue?</Text>
        <View style={styles.categoryGrid}>
          {TICKET_CATEGORIES.map((item) => {
            const active = item === category;
            return (
              <Pressable
                key={item}
                style={[styles.categoryCard, active && styles.categoryCardActive]}
                onPress={() => setCategory(item)}
              >
                <Ionicons
                  name={CATEGORY_ICONS[item]}
                  size={26}
                  color={active ? COLORS.primary : COLORS.textPrimary}
                />
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Add Visual Context</Text>
        {images.length === 0 ? (
          <Pressable style={styles.uploadBox} onPress={pickImages}>
            <Ionicons name="camera-outline" size={24} color={COLORS.textMuted} />
            <Text style={styles.uploadText}>Upload Issue Photos (max 5)</Text>
          </Pressable>
        ) : (
          <View style={styles.uploadBox}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.uploadThumbRow}
              style={styles.uploadThumbScroll}
            >
              {images.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.uploadThumbWrap}>
                  <Image source={{ uri: item.uri }} style={styles.uploadThumb} />
                  <Pressable
                    style={styles.uploadThumbRemove}
                    onPress={() => removeImageAt(index)}
                    hitSlop={6}
                  >
                    <Text style={styles.uploadThumbRemoveText}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {images.length < MAX_TICKET_IMAGES && (
                <Pressable style={styles.uploadThumbAdd} onPress={pickImages}>
                  <Ionicons name="add" size={26} color={COLORS.textMuted} />
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}

        <Text style={styles.sectionTitle}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="Briefly Describe The Problem..."
          value={subject}
          onChangeText={setSubject}
          maxLength={120}
        />
        {showFieldValidation && subjectLength < 5 ? (
          <Text
            style={[
              styles.fieldValidationText,
              styles.fieldValidationError,
            ]}
          >
            Minimum 5 characters ({subjectLength}/5)
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell Us More Details"
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={1500}
        />
        {showFieldValidation && descriptionLength < 10 ? (
          <Text
            style={[
              styles.fieldValidationText,
              styles.fieldValidationError,
            ]}
          >
            Minimum 10 characters ({descriptionLength}/10)
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Urgency Level</Text>
        <View style={styles.urgencyRow}>
          {TICKET_URGENCY_LEVELS.map((item) => {
            const active = item === urgency;
            return (
              <Pressable
                key={item}
                style={[styles.urgencyBtn, active && styles.urgencyBtnActive]}
                onPress={() => setUrgency(item)}
              >
                <Text style={[styles.urgencyText, active && styles.urgencyTextActive]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={submitTicket}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.submitText}>Submit Ticket</Text>
          )}
        </Pressable>
        {submitMessage?.text && submitMessage.type === "success" ? (
          <View
            style={[
              styles.feedbackBox,
              styles.feedbackSuccess,
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                styles.feedbackSuccessText,
              ]}
            >
              {submitMessage.text}
            </Text>
          </View>
        ) : null}

        <View onLayout={(event) => setHistorySectionY(event.nativeEvent.layout.y)}>
          <Text style={styles.sectionTitle}>My Recent Tickets</Text>
        </View>
        <View style={styles.ticketList}>
          {myTickets.length ? (
            myTickets.slice(0, 5).map((ticket) => {
              const statusTheme =
                TICKET_STATUS_COLORS[ticket.status] || TICKET_STATUS_COLORS.Open;
              return (
                <View key={ticket.id} style={styles.ticketCard}>
                  <View style={styles.ticketHead}>
                    <Text style={styles.ticketNo}>{ticket.ticketNumber}</Text>
                    <View
                      style={[
                        styles.ticketStatus,
                        {
                          backgroundColor: statusTheme.bg,
                          borderColor: statusTheme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.ticketStatusText, { color: statusTheme.text }]}>
                        {ticket.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketSubject} numberOfLines={1}>
                    {ticket.subject}
                  </Text>
                  <Text style={styles.ticketMeta} numberOfLines={1}>
                    {ticket.category} · {ticket.urgency}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.ticketEmpty}>
              <Text style={styles.ticketEmptyText}>No tickets submitted yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.studentScreenBackground,
  },
  header: {
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 20,
    paddingTop: 10,
  },
  stayCard: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 18,
    overflow: "hidden",
  },
  stayBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  stayBadgeDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#60A5FA",
  },
  stayLabel: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.primaryLight,
  },
  stayValue: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 18,
    color: COLORS.white,
    lineHeight: 26,
  },
  sectionTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 6,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  categoryCard: {
    width: "48.4%",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    marginBottom: 10,
  },
  categoryCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  categoryText: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 15,
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  categoryTextActive: {
    color: COLORS.primaryDark,
  },
  uploadBox: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: COLORS.border,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
    overflow: "hidden",
  },
  uploadText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  uploadThumbScroll: {
    alignSelf: "stretch",
  },
  uploadThumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  uploadThumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
  },
  uploadThumb: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.background,
  },
  uploadThumbRemove: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 99,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadThumbRemoveText: {
    fontSize: 11,
    color: "#fff",
    fontFamily: "PublicSans_700Bold",
    lineHeight: 13,
  },
  uploadThumbAdd: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  textArea: {
    minHeight: 100,
  },
  urgencyRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    marginBottom: 10,
  },
  urgencyBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 8,
  },
  urgencyBtnActive: {
    backgroundColor: COLORS.primaryLight,
  },
  urgencyText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  urgencyTextActive: {
    color: COLORS.primaryDark,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 16,
    color: COLORS.white,
  },
  fieldValidationText: {
    marginTop: -2,
    marginBottom: 10,
    marginLeft: 2,
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
  },
  fieldValidationError: {
    color: COLORS.maintenance,
  },
  feedbackBox: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  feedbackSuccess: {
    backgroundColor: "#EEF9F1",
    borderColor: "#A7E0B8",
  },
  feedbackText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
  },
  feedbackSuccessText: {
    color: "#207A3A",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mutedText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
  ticketList: {
    marginTop: 2,
    marginBottom: 8,
    gap: 8,
  },
  ticketCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ticketHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  ticketNo: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 11,
    color: COLORS.textMuted,
  },
  ticketStatus: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ticketStatusText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 11,
  },
  ticketSubject: {
    marginTop: 6,
    fontFamily: "PublicSans_700Bold",
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  ticketMeta: {
    marginTop: 4,
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  ticketEmpty: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  ticketEmptyText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
