import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { COLORS } from "../../constants/colors";
import {
  addTicketNote,
  assignTicket,
  getAllTickets,
  getMyAssignedTickets,
  getStaffOptions,
  getTicketById,
  getTicketErrorMessage,
  getTicketImageUrls,
  updateTicketStatus,
} from "../../services/ticket.service";
import apiClient from "../../lib/axios";
import {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TICKET_STATUS_COLORS,
  TICKET_URGENCY_LEVELS,
} from "../../types/ticket";
import { storage } from "../../lib/storage";

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "N/A";
  }
}

function isTicketAssignedToUser(ticket, userId, userEmail) {
  const assignedId = String(
    ticket?.assignedTo?.id || ticket?.assignedTo?._id || "",
  );
  const assignedEmail = String(ticket?.assignedTo?.email || "")
    .trim()
    .toLowerCase();
  const normalEmail = String(userEmail || "")
    .trim()
    .toLowerCase();
  return (
    (!!assignedId && assignedId === String(userId)) ||
    (!!assignedEmail && !!normalEmail && assignedEmail === normalEmail)
  );
}

function StatusPill({ status }) {
  const theme = TICKET_STATUS_COLORS[status] || TICKET_STATUS_COLORS.Open;
  return (
    <View
      style={[
        styles.statusPill,
        { backgroundColor: theme.bg, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.statusPillText, { color: theme.text }]}>
        {status}
      </Text>
    </View>
  );
}

function getUrgencyTheme(urgency) {
  if (urgency === "High")
    return { dot: COLORS.maintenance, text: COLORS.maintenance };
  if (urgency === "Medium") return { dot: COLORS.full, text: COLORS.full };
  return { dot: COLORS.available, text: COLORS.available };
}

function MetaRow({ icon, label, value, last }) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowBorder]}>
      <View style={styles.metaRowLeft}>
        <Ionicons name={icon} size={13} color={COLORS.textMuted} />
        <Text style={styles.metaRowLabel}>{label}</Text>
      </View>
      <Text style={styles.metaRowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function StaffAssignDropdown({
  ticketId,
  value,
  onChange,
  options,
  loading,
  disabled = false,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((item) => item.id === value);
  const label = loading
    ? "Loading staff..."
    : selected
      ? `${selected.name}${selected.isApproved ? "" : " (Inactive)"}`
      : "Assign to staff";

  return (
    <View style={compact ? styles.assignWrapCompact : styles.assignWrap}>
      <Pressable
        style={[styles.assignSelectBtn, disabled && styles.actionDisabled]}
        onPress={() => setOpen(true)}
        disabled={disabled}
      >
        <Text style={styles.assignSelectText} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons
          name={open ? "chevron-up-outline" : "chevron-down-outline"}
          size={14}
          color={COLORS.textMuted}
        />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.typePickerBackdrop}
          onPress={() => setOpen(false)}
        >
          <View style={styles.typePickerCard}>
            <Text style={styles.filterModalTitle}>Assign To Staff</Text>
            {options.length ? (
              <ScrollView style={styles.assignMenuScroll} nestedScrollEnabled>
                {options.map((item) => (
                  <Pressable
                    key={`${ticketId}-${item.id}`}
                    style={styles.assignOption}
                    onPress={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                  >
                    <Text style={styles.assignOptionTitle}>{item.name}</Text>
                    <Text style={styles.assignOptionSub} numberOfLines={1}>
                      {item.email}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.assignEmptyText}>No staff found</Text>
            )}
            <View style={styles.filterModalActions}>
              <Pressable
                style={styles.filterActionSecondary}
                onPress={() => setOpen(false)}
              >
                <Text style={styles.filterActionSecondaryText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function TicketCard({
  ticket,
  onPress,
  onAssignToMe,
  onAssignToStaff,
  onRemoveAssignee,
  onQuickStatus,
  actionBusy,
  currentUserId,
  currentUserEmail,
  staffOptions,
  staffLoading,
  selectedStaffByTicket,
  allowAssignmentActions = true,
  canResolveAnyInProgress = false,
  onSelectStaff,
}) {
  const isAssignedToMe = isTicketAssignedToUser(
    ticket,
    currentUserId,
    currentUserEmail,
  );
  const canAssignToMe = !ticket.assignedTo?.id;
  const canResolve =
    ticket.status === "In Progress" &&
    (isAssignedToMe || canResolveAnyInProgress);
  const urgencyTheme = getUrgencyTheme(ticket.urgency);

  return (
    <Pressable style={styles.ticketCard} onPress={() => onPress(ticket)}>
      <View style={styles.cardHead}>
        <View style={styles.headerLeft}>
          <View style={styles.cardIconWrap}>
            <Ionicons
              name="construct-outline"
              size={18}
              color={COLORS.primary}
            />
          </View>
          <View>
            <Text style={styles.subject} numberOfLines={1}>
              {ticket.subject}
            </Text>
            <Text style={styles.ticketNo}>{ticket.ticketNumber}</Text>
          </View>
        </View>
        <StatusPill status={ticket.status} />
      </View>

      <View style={styles.infoStrip}>
        <View style={styles.metaTopRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {ticket.category} · Room {ticket.room?.roomNumber || "N/A"}
          </Text>
          <View style={styles.urgencyBadge}>
            <View
              style={[styles.urgencyDot, { backgroundColor: urgencyTheme.dot }]}
            />
            <Text style={[styles.urgencyText, { color: urgencyTheme.text }]}>
              {ticket.urgency} Priority
            </Text>
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {ticket.createdBy?.name || "Student"} · {formatDate(ticket.updatedAt)}
        </Text>
        {ticket.assignedTo?.name ? (
          <Text style={styles.meta} numberOfLines={1}>
            Assigned To: {ticket.assignedTo.name}
          </Text>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionView} onPress={() => onPress(ticket)}>
          <Ionicons name="eye-outline" size={15} color={COLORS.primary} />
          <Text style={styles.actionViewText}>View</Text>
        </Pressable>
        {canAssignToMe ? (
          <Pressable
            style={[
              styles.actionBtn,
              styles.actionAssign,
              actionBusy && styles.actionDisabled,
            ]}
            onPress={() => onAssignToMe(ticket)}
            disabled={actionBusy}
          >
            <Ionicons
              name="person-add-outline"
              size={14}
              color={COLORS.purple}
            />
            <Text style={[styles.actionBtnText, { color: COLORS.purple }]}>
              Assign to me
            </Text>
          </Pressable>
        ) : null}
        {canResolve ? (
          <Pressable
            style={[
              styles.actionBtn,
              styles.actionResolve,
              actionBusy && styles.actionDisabled,
            ]}
            onPress={() => onQuickStatus(ticket, "Resolved")}
            disabled={actionBusy}
          >
            <Ionicons name="checkmark-done-outline" size={14} color="#15803D" />
            <Text style={[styles.actionBtnText, { color: "#15803D" }]}>
              Resolve
            </Text>
          </Pressable>
        ) : null}
      </View>

      {allowAssignmentActions ? (
        <>
          <StaffAssignDropdown
            ticketId={ticket.id}
            value={
              selectedStaffByTicket[ticket.id] || ticket.assignedTo?.id || ""
            }
            onChange={(staffId) => onAssignToStaff(ticket, staffId)}
            options={staffOptions}
            loading={staffLoading}
            disabled={actionBusy}
            compact
          />
          {ticket.assignedTo?.id ? (
            <Pressable
              style={[
                styles.removeAssignBtn,
                actionBusy && styles.actionDisabled,
              ]}
              onPress={() => onRemoveAssignee(ticket)}
              disabled={actionBusy}
            >
              <Ionicons
                name="close-circle-outline"
                size={14}
                color={COLORS.maintenance}
              />
              <Text style={styles.removeAssignText}>Remove Assignee</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
      <StaffAssignDropdown
        ticketId={ticket.id}
        value={selectedStaffByTicket[ticket.id]}
        onChange={(staffId) => onSelectStaff(ticket.id, staffId)}
        options={staffOptions}
        loading={staffLoading}
        disabled={actionBusy}
        compact
      />
    </Pressable>
  );
}

function TicketAttachments({ ticket }) {
  const imageItems =
    Array.isArray(ticket?.images) && ticket.images.length
      ? ticket.images
      : ticket?.imageUrl
        ? [{ url: ticket.imageUrl, name: ticket.imageName || "Attachment" }]
        : [];

  if (!imageItems.length) return null;

  return (
    <View style={styles.attachmentBlock}>
      <Text style={styles.attachmentTitle}>Attachments</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.attachmentScroll}
        contentContainerStyle={styles.attachmentRow}
      >
        {imageItems.map((img, idx) => (
          <Pressable
            key={`${img.url || idx}-${idx}`}
            style={styles.attachmentItem}
            onPress={() => {
              if (img?.url) {
                Linking.openURL(img.url).catch(() => {
                  Alert.alert("Attachment", "Unable to open this image.");
                });
              }
            }}
          >
            <Image source={{ uri: img.url }} style={styles.attachmentPreview} />
            <Text style={styles.attachmentName} numberOfLines={1}>
              {img.name || `Image ${idx + 1}`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.attachmentHint}>Tap image to open</Text>
    </View>
  );
}

export default function TicketManagementScreen({
  headerTitle = "Ticket Management",
  showHeader = true,
  staffOnly = false,
}) {
  const initialLoadDone = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [activeStatus, setActiveStatus] = useState(staffOnly ? "" : "Open");
  const [activeCategory, setActiveCategory] = useState("");
  const [activeUrgency, setActiveUrgency] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [ticketScope, setTicketScope] = useState(staffOnly ? "mine" : "all");
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(staffOnly ? "" : "Open");
  const [draftCategory, setDraftCategory] = useState("");
  const [draftUrgency, setDraftUrgency] = useState("");
  const [quickActionTicketId, setQuickActionTicketId] = useState("");
  const [scopeDefaultsActive, setScopeDefaultsActive] = useState(!staffOnly);
  const [staffOptions, setStaffOptions] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedStaffByTicket, setSelectedStaffByTicket] = useState({});

  const statusFilters = useMemo(() => ["", ...TICKET_STATUSES], []);
  const categoryFilters = useMemo(() => ["", ...TICKET_CATEGORIES], []);
  const urgencyFilters = useMemo(() => ["", ...TICKET_URGENCY_LEVELS], []);

  const scopedTickets = useMemo(() => {
    if (ticketScope !== "mine") return tickets;
    return tickets.filter((t) =>
      isTicketAssignedToUser(t, currentUserId, currentUserEmail),
    );
  }, [tickets, ticketScope, currentUserId, currentUserEmail]);

  // Server already filters by status/category/urgency/search — client-side
  // re-filtering here guards against stale results while a new fetch is loading.
  const visibleTickets = useMemo(() => {
    const q = String(searchQuery || "")
      .trim()
      .toLowerCase();
    return scopedTickets.filter((ticket) => {
      if (activeStatus && ticket.status !== activeStatus) return false;
      if (activeCategory && ticket.category !== activeCategory) return false;
      if (activeUrgency && ticket.urgency !== activeUrgency) return false;
      if (!q) return true;
      const haystack = [
        ticket.ticketNumber,
        ticket.subject,
        ticket.room?.roomNumber,
        ticket.createdBy?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [scopedTickets, activeStatus, activeCategory, activeUrgency, searchQuery]);

  const summary = useMemo(() => {
    const counts = {
      total: scopedTickets.length,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
    };
    for (const t of scopedTickets) {
      if (t.status === "Open") counts.open += 1;
      else if (t.status === "In Progress") counts.inProgress += 1;
      else if (t.status === "Resolved") counts.resolved += 1;
      else if (t.status === "Closed") counts.closed += 1;
    }
    return counts;
  }, [scopedTickets]);

  const loadTickets = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (!initialLoadDone.current) {
          setLoading(true);
        }
        const loader = staffOnly ? getMyAssignedTickets : getAllTickets;
        const { tickets: list } = await loader({
          status: activeStatus || undefined,
          category: activeCategory || undefined,
          urgency: activeUrgency || undefined,
          search: searchQuery,
        });
        setTickets(list);
      } catch (error) {
        Alert.alert("Tickets", getTicketErrorMessage(error));
      } finally {
        initialLoadDone.current = true;
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [activeStatus, activeCategory, activeUrgency, searchQuery, staffOnly],
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadStaff = useCallback(async () => {
    try {
      setStaffLoading(true);
      const options = await getStaffOptions();
      setStaffOptions(options);
    } catch {
      setStaffOptions([]);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    const next = {};
    for (const ticket of tickets) {
      if (ticket?.id && ticket?.assignedTo?.id) {
        next[ticket.id] = ticket.assignedTo.id;
      }
    }
    setSelectedStaffByTicket(next);
  }, [tickets]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await storage.getUser();
      if (!mounted) return;
      const localId = String(user?.id || user?._id || "");
      const localEmail = String(user?.email || "");
      const localRole = String(user?.role || "").toLowerCase();
      setCurrentUserId(localId);
      setCurrentUserEmail(localEmail);
      setCurrentUserRole(localRole);
      if (!localId || !localEmail) {
        try {
          const { data } = await apiClient.get("/auth/me");
          if (!mounted) return;
          setCurrentUserId(String(data?.id || data?._id || localId || ""));
          setCurrentUserEmail(String(data?.email || localEmail || ""));
          setCurrentUserRole(
            String(data?.role || localRole || "").toLowerCase(),
          );
        } catch {
          // Non-blocking; fall back to storage values only.
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const withPresignedImages = async (ticket) => {
    if (!ticket?.id) return ticket;
    try {
      const signedImages = await getTicketImageUrls(ticket.id);
      if (signedImages.length) {
        return {
          ...ticket,
          images: signedImages,
          imageUrl: signedImages[0]?.url ?? ticket.imageUrl,
        };
      }
    } catch {
      // Non-blocking — fall back to whatever URLs are stored on the ticket
    }
    return ticket;
  };

  const openTicket = async (ticket) => {
    try {
      setSelectedTicket({ ...ticket, loading: true });
      const full = await getTicketById(ticket.id);
      setSelectedTicket(await withPresignedImages(full));
    } catch (error) {
      setSelectedTicket(ticket);
      Alert.alert("Ticket", getTicketErrorMessage(error));
    }
  };

  const closeModal = () => {
    setSelectedTicket(null);
    setStatusNote("");
  };

  const applySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const setScope = (scope) => {
    setTicketScope(scope);
    if (scopeDefaultsActive) {
      const defaultStatus = scope === "mine" ? "In Progress" : "Open";
      setActiveStatus(defaultStatus);
      setDraftStatus(defaultStatus);
    }
  };

  const openFilterPicker = () => {
    setDraftStatus(activeStatus);
    setDraftCategory(activeCategory);
    setDraftUrgency(activeUrgency);
    setFilterPickerOpen(true);
  };

  const applyFilters = () => {
    setActiveStatus(draftStatus);
    setActiveCategory(draftCategory);
    setActiveUrgency(draftUrgency);
    setFilterPickerOpen(false);
  };

  const clearFilters = () => {
    setScopeDefaultsActive(false);
    setDraftStatus("");
    setDraftCategory("");
    setDraftUrgency("");
    setActiveStatus("");
    setActiveCategory("");
    setActiveUrgency("");
    setFilterPickerOpen(false);
  };

  const handleStatusChange = async (status) => {
    if (!selectedTicket?.id || statusUpdating) return;
    try {
      setStatusUpdating(true);
      const updated = await updateTicketStatus(selectedTicket.id, {
        status,
        note: statusNote,
      });
      setSelectedTicket((prev) => ({
        ...prev,
        status: updated.status,
        statusLog: updated.statusLog,
        updatedAt: updated.updatedAt,
      }));
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      Alert.alert("Updated", `Ticket moved to "${status}".`);
      setStatusNote("");
    } catch (error) {
      Alert.alert("Unable to update", getTicketErrorMessage(error));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedTicket?.id || !currentUserId || statusUpdating) return;
    try {
      setStatusUpdating(true);
      const updated = await assignTicket(selectedTicket.id, {
        assignedTo: currentUserId,
        note: "Ticket self-assigned from dashboard",
      });
      setSelectedTicket((prev) => ({
        ...prev,
        assignedTo: updated.assignedTo,
        status: updated.status,
        statusLog: updated.statusLog,
        updatedAt: updated.updatedAt,
      }));
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      setScope("mine");
      Alert.alert("Assigned", "Ticket assigned to you.");
    } catch (error) {
      Alert.alert("Unable to assign", getTicketErrorMessage(error));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleQuickAssignToMe = async (ticket) => {
    if (!ticket?.id || !currentUserId) return;
    try {
      setQuickActionTicketId(ticket.id);
      const updated = await assignTicket(ticket.id, {
        assignedTo: currentUserId,
        note: "Ticket self-assigned from queue",
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      setScope("mine");
    } catch (error) {
      Alert.alert("Unable to assign", getTicketErrorMessage(error));
    } finally {
      setQuickActionTicketId("");
    }
  };

  const handleQuickStatus = async (ticket, nextStatus) => {
    if (!ticket?.id) return;
    try {
      setQuickActionTicketId(ticket.id);
      const updated = await updateTicketStatus(ticket.id, {
        status: nextStatus,
        note: "",
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
    } catch (error) {
      Alert.alert("Unable to update", getTicketErrorMessage(error));
    } finally {
      setQuickActionTicketId("");
    }
  };

  const handleAssignToStaff = async (ticket, staffId) => {
    if (!ticket?.id || !staffId) return;
    try {
      setQuickActionTicketId(ticket.id);
      const selectedStaff = staffOptions.find((item) => item.id === staffId);
      const updated = await assignTicket(ticket.id, {
        assignedTo: staffId,
        note: selectedStaff
          ? `Ticket assigned to ${selectedStaff.name}`
          : "Ticket assignment updated",
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      setSelectedStaffByTicket((prev) => ({ ...prev, [ticket.id]: staffId }));
      if (selectedTicket?.id === updated.id) {
        setSelectedTicket(updated);
      }
    } catch (error) {
      Alert.alert("Unable to assign", getTicketErrorMessage(error));
    } finally {
      setQuickActionTicketId("");
    }
  };

  const handleRemoveAssignee = async (ticket) => {
    if (!ticket?.id) return;
    try {
      setQuickActionTicketId(ticket.id);
      const updated = await assignTicket(ticket.id, {
        assignedTo: "",
        note: "Assignee removed from dashboard",
      });
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      setSelectedStaffByTicket((prev) => ({ ...prev, [ticket.id]: "" }));
      if (selectedTicket?.id === updated.id) {
        setSelectedTicket(updated);
      }
    } catch (error) {
      Alert.alert("Unable to unassign", getTicketErrorMessage(error));
    } finally {
      setQuickActionTicketId("");
    }
  };

  const handleAddNote = async () => {
    if (!selectedTicket?.id || statusNote.trim().length < 3 || statusUpdating)
      return;
    try {
      setStatusUpdating(true);
      const updated = await addTicketNote(selectedTicket.id, {
        note: statusNote,
      });
      setSelectedTicket((prev) => ({
        ...prev,
        statusLog: updated.statusLog,
        updatedAt: updated.updatedAt,
      }));
      setTickets((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      setStatusNote("");
      Alert.alert("Saved", "Ticket note added.");
    } catch (error) {
      Alert.alert("Unable to add note", getTicketErrorMessage(error));
    } finally {
      setStatusUpdating(false);
    }
  };

  const renderHeader = () => (
    <View>
      {showHeader ? (
        <View style={styles.headerCard}>
          <Text style={styles.title}>{headerTitle}</Text>
          <Text style={styles.subtitle}>
            Track complaints and move tickets through each stage
          </Text>
        </View>
      ) : null}

      <View style={styles.statsBar}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#B45309" }]}>
              {summary.open}
            </Text>
            <Text style={styles.summaryLabel}>Open</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#2563EB" }]}>
              {summary.inProgress}
            </Text>
            <Text style={styles.summaryLabel}>In Progress</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: "#15803D" }]}>
              {summary.resolved + summary.closed}
            </Text>
            <Text style={styles.summaryLabel}>Resolved</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchRowWrap}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search tickets"
            returnKeyType="search"
            onSubmitEditing={applySearch}
          />
          <Pressable style={styles.searchBtn} onPress={applySearch}>
            <Ionicons name="search" size={16} color={COLORS.white} />
          </Pressable>
          <Pressable style={styles.filterBtn} onPress={openFilterPicker}>
            <Ionicons
              name="options-outline"
              size={16}
              color={COLORS.textSecondary}
            />
          </Pressable>
        </View>
        {(activeStatus || activeCategory || activeUrgency) && (
          <View style={styles.activeFiltersRow}>
            {activeStatus ? (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>
                  Status: {activeStatus}
                </Text>
              </View>
            ) : null}
            {activeCategory ? (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>
                  Type: {activeCategory}
                </Text>
              </View>
            ) : null}
            {activeUrgency ? (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>
                  Priority: {activeUrgency}
                </Text>
              </View>
            ) : null}
            <Pressable onPress={clearFilters}>
              <Text style={styles.clearFilterText}>Clear</Text>
            </Pressable>
          </View>
        )}
        {!staffOnly ? (
          <View style={styles.scopeRow}>
            <Pressable
              style={[
                styles.scopeChip,
                ticketScope === "all" && styles.scopeChipActive,
              ]}
              onPress={() => setScope("all")}
            >
              <Text
                style={[
                  styles.scopeChipText,
                  ticketScope === "all" && styles.scopeChipTextActive,
                ]}
              >
                All Tickets
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.scopeChip,
                ticketScope === "mine" && styles.scopeChipActive,
              ]}
              onPress={() => setScope("mine")}
            >
              <Text
                style={[
                  styles.scopeChipText,
                  ticketScope === "mine" && styles.scopeChipTextActive,
                ]}
              >
                My Tickets
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );

  const renderFilterSelector = (items, selected, onChange) => (
    <View style={styles.filterRow}>
      {items.map((value) => {
        const label = value || "All";
        const active = selected === value;
        return (
          <Pressable
            key={label}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onChange(value)}
          >
            <Text
              style={[
                styles.filterChipText,
                active && styles.filterChipTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderTicket = ({ item }) => (
    <TicketCard
      ticket={item}
      onPress={openTicket}
      onAssignToMe={handleQuickAssignToMe}
      onAssignToStaff={handleAssignToStaff}
      onRemoveAssignee={handleRemoveAssignee}
      onQuickStatus={handleQuickStatus}
      actionBusy={quickActionTicketId === item.id}
      currentUserId={currentUserId}
      currentUserEmail={currentUserEmail}
      staffOptions={staffOptions}
      staffLoading={staffLoading}
      selectedStaffByTicket={selectedStaffByTicket}
      allowAssignmentActions={!staffOnly}
      canResolveAnyInProgress={
        currentUserRole === "admin" || currentUserRole === "warden"
      }
      onSelectStaff={(ticketId, staffId) =>
        setSelectedStaffByTicket((prev) => ({ ...prev, [ticketId]: staffId }))
      }
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="file-tray-outline" size={56} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>
        {ticketScope === "mine"
          ? "No assigned tickets yet"
          : "No tickets found"}
      </Text>
      <Text style={styles.emptyText}>
        {ticketScope === "mine"
          ? "Tickets you assign to yourself will appear here."
          : "No tickets found for selected filters."}
      </Text>
    </View>
  );

  const isMineSelected = selectedTicket
    ? isTicketAssignedToUser(selectedTicket, currentUserId, currentUserEmail)
    : false;
  const canManagerResolve =
    currentUserRole === "admin" || currentUserRole === "warden";
  const canResolveSelected =
    selectedTicket?.status === "In Progress" &&
    (isMineSelected || canManagerResolve);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleTickets}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTicket}
          ListHeaderComponent={renderHeader()}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTickets(true)}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      <Modal
        visible={!!selectedTicket}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ticket Detail</Text>
              <Pressable onPress={closeModal}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </Pressable>
            </View>

            {selectedTicket?.loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : (
              <>
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Status + urgency */}
                  <View style={styles.modalBadgeRow}>
                    <StatusPill status={selectedTicket?.status} />
                    <View style={[styles.urgencyBadge, { marginLeft: 8 }]}>
                      <View
                        style={[
                          styles.urgencyDot,
                          {
                            backgroundColor: getUrgencyTheme(
                              selectedTicket?.urgency,
                            ).dot,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.urgencyText,
                          {
                            color: getUrgencyTheme(selectedTicket?.urgency)
                              .text,
                          },
                        ]}
                      >
                        {selectedTicket?.urgency} Priority
                      </Text>
                    </View>
                  </View>

                  {/* Ticket number + subject */}
                  <Text style={styles.modalTicketNo}>
                    {selectedTicket?.ticketNumber}
                  </Text>
                  <Text style={styles.modalSubject}>
                    {selectedTicket?.subject}
                  </Text>

                  {/* Description */}
                  <View style={styles.descBox}>
                    <Text style={styles.modalBody}>
                      {selectedTicket?.description}
                    </Text>
                  </View>

                  {/* Meta rows */}
                  <View style={styles.metaCard}>
                    <MetaRow
                      icon="construct-outline"
                      label="Type"
                      value={selectedTicket?.category}
                    />
                    <MetaRow
                      icon="bed-outline"
                      label="Room"
                      value={selectedTicket?.room?.roomNumber || "N/A"}
                    />
                    <MetaRow
                      icon="person-outline"
                      label="Student"
                      value={selectedTicket?.createdBy?.name || "N/A"}
                    />
                    <MetaRow
                      icon="person-circle-outline"
                      label="Assigned"
                      value={selectedTicket?.assignedTo?.name || "Unassigned"}
                      last
                    />
                  </View>

                  {/* Attachments */}
                  <TicketAttachments ticket={selectedTicket} />

                  {/* Assign To Me */}
                  {!selectedTicket?.assignedTo?.id && (
                    <Pressable
                      style={[
                        styles.assignBtn,
                        statusUpdating && styles.actionDisabled,
                      ]}
                      onPress={handleAssignToMe}
                      disabled={statusUpdating}
                    >
                      <Ionicons
                        name="person-add-outline"
                        size={14}
                        color={COLORS.primaryDark}
                      />
                      <Text style={styles.assignBtnText}>Assign To Me</Text>
                    </Pressable>
                  )}

                  {!staffOnly ? (
                    <>
                      <StaffAssignDropdown
                        ticketId={selectedTicket?.id}
                        value={
                          selectedStaffByTicket[selectedTicket?.id] ||
                          selectedTicket?.assignedTo?.id ||
                          ""
                        }
                        onChange={(staffId) =>
                          handleAssignToStaff(selectedTicket, staffId)
                        }
                        options={staffOptions}
                        loading={staffLoading}
                        disabled={statusUpdating}
                      />
                      {selectedTicket?.assignedTo?.id ? (
                        <Pressable
                          style={[
                            styles.removeAssignBtn,
                            statusUpdating && styles.actionDisabled,
                          ]}
                          onPress={() => handleRemoveAssignee(selectedTicket)}
                          disabled={statusUpdating}
                        >
                          <Ionicons
                            name="close-circle-outline"
                            size={14}
                            color={COLORS.maintenance}
                          />
                          <Text style={styles.removeAssignText}>
                            Remove Assignee
                          </Text>
                        </Pressable>
                      ) : null}
                    </>
                  ) : null}
                  <StaffAssignDropdown
                    ticketId={selectedTicket?.id}
                    value={selectedStaffByTicket[selectedTicket?.id]}
                    onChange={(staffId) =>
                      setSelectedStaffByTicket((prev) => ({
                        ...prev,
                        [selectedTicket?.id]: staffId,
                      }))
                    }
                    options={staffOptions}
                    loading={staffLoading}
                    disabled={statusUpdating}
                  />

                  {/* Note input + Add Note */}
                  {isMineSelected &&
                  selectedTicket?.status === "In Progress" ? (
                    <>
                      <Text style={styles.noteBlockLabel}>Add a note</Text>
                      <TextInput
                        style={styles.noteInput}
                        placeholder="Handover notes, updates... (min 3 chars)"
                        value={statusNote}
                        onChangeText={setStatusNote}
                        multiline
                      />
                      <Pressable
                        style={[
                          styles.addNoteBtn,
                          statusNote.trim().length < 3 &&
                            styles.addNoteBtnDisabled,
                        ]}
                        onPress={handleAddNote}
                        disabled={
                          statusNote.trim().length < 3 || statusUpdating
                        }
                      >
                        <Text style={styles.addNoteBtnText}>Add Note</Text>
                      </Pressable>
                    </>
                  ) : null}

                  {/* Timeline */}
                  {!!selectedTicket?.statusLog?.length && (
                    <View style={styles.timelineBlock}>
                      <Text style={styles.timelineTitle}>Recent Updates</Text>
                      {[...selectedTicket.statusLog]
                        .reverse()
                        .map((entry, idx) => {
                          const dotTheme =
                            TICKET_STATUS_COLORS[entry.status] ||
                            TICKET_STATUS_COLORS.Open;
                          return (
                            <View
                              key={`${entry.changedAt || idx}-${entry.status}`}
                              style={styles.timelineEntry}
                            >
                              <View style={styles.timelineDotCol}>
                                <View
                                  style={[
                                    styles.timelineDot,
                                    {
                                      backgroundColor: dotTheme.text,
                                      borderColor: dotTheme.bg,
                                    },
                                  ]}
                                />
                                {idx < selectedTicket.statusLog.length - 1 && (
                                  <View style={styles.timelineLine} />
                                )}
                              </View>
                              <View style={styles.timelineEntryBody}>
                                <View style={styles.timelineEntryTop}>
                                  <StatusPill status={entry.status} />
                                  <Text style={styles.timelineDate}>
                                    {formatDate(entry.changedAt)}
                                  </Text>
                                </View>
                                <Text
                                  style={
                                    entry.note
                                      ? styles.timelineNote
                                      : styles.timelineNoNote
                                  }
                                >
                                  {entry.note || "No note added"}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  )}

                  <View style={styles.modalScrollEnd} />
                </ScrollView>

                {canResolveSelected ? (
                  <View style={styles.modalFooter}>
                    <Pressable
                      style={[
                        styles.resolveActionBtn,
                        statusUpdating && styles.actionDisabled,
                      ]}
                      onPress={() => handleStatusChange("Resolved")}
                      disabled={statusUpdating}
                    >
                      <Ionicons
                        name="checkmark-done-outline"
                        size={16}
                        color={COLORS.white}
                      />
                      <Text style={styles.resolveActionText}>
                        Mark as Resolved
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={filterPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterPickerOpen(false)}
      >
        <Pressable
          style={styles.typePickerBackdrop}
          onPress={() => setFilterPickerOpen(false)}
        >
          <View style={styles.typePickerCard}>
            <Text style={styles.filterModalTitle}>Filter Tickets</Text>
            <Text style={styles.filterModalSectionTitle}>Status</Text>
            {renderFilterSelector(statusFilters, draftStatus, setDraftStatus)}
            <Text style={styles.filterModalSectionTitle}>Type</Text>
            {renderFilterSelector(
              categoryFilters,
              draftCategory,
              setDraftCategory,
            )}
            <Text style={styles.filterModalSectionTitle}>Priority</Text>
            {renderFilterSelector(
              urgencyFilters,
              draftUrgency,
              setDraftUrgency,
            )}
            <View style={styles.filterModalActions}>
              <Pressable
                style={styles.filterActionSecondary}
                onPress={clearFilters}
              >
                <Text style={styles.filterActionSecondaryText}>Reset</Text>
              </Pressable>
              <Pressable
                style={styles.filterActionPrimary}
                onPress={applyFilters}
              >
                <Text style={styles.filterActionPrimaryText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  statsBar: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryDivider: {
    width: 1,
    height: 44,
    backgroundColor: COLORS.border,
  },
  summaryLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 10,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 19,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  searchRowWrap: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scopeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  scopeChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.background,
  },
  scopeChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  scopeChipText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  scopeChipTextActive: {
    color: COLORS.primaryDark,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFiltersRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  activeFilterTag: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeFilterText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  clearFilterText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.maintenance,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  typePickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.2)",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  typePickerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  filterModalTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 17,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  filterModalSectionTitle: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 8,
  },
  filterModalActions: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  filterActionSecondary: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  filterActionSecondaryText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filterActionPrimary: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
  },
  filterActionPrimaryText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.white,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  filterChipTextActive: { color: COLORS.primaryDark },
  listContent: { paddingBottom: 100 },
  ticketCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketNo: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  subject: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  infoStrip: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 10,
  },
  metaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  meta: {
    marginTop: 2,
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  urgencyDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  urgencyText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 11,
  },
  statusPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillText: { fontFamily: "PublicSans_600SemiBold", fontSize: 11 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  actionRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionView: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionViewText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.primary,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  actionAssign: {
    backgroundColor: COLORS.purpleBg,
    borderColor: "#DDD6FE",
  },
  actionResolve: {
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
  },
  actionBtnText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  emptyState: {
    backgroundColor: COLORS.background,
    paddingVertical: 64,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 17,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  emptyText: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.42)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    minHeight: "68%",
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  modalScroll: { flex: 1 },
  modalScrollContent: { paddingTop: 4 },
  modalScrollEnd: { height: 16 },
  modalBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  modalTicketNo: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  modalSubject: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 20,
    color: COLORS.textPrimary,
    lineHeight: 26,
    marginBottom: 10,
  },
  descBox: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modalBody: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  metaCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    marginBottom: 12,
    overflow: "hidden",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  metaRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaRowLabel: {
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  metaRowValue: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textPrimary,
    maxWidth: "55%",
    textAlign: "right",
  },
  attachmentBlock: {
    marginTop: 4,
    marginBottom: 14,
  },
  attachmentTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  attachmentScroll: {
    flexGrow: 0,
  },
  attachmentRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 4,
  },
  attachmentItem: {
    width: 96,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 4,
    backgroundColor: COLORS.white,
  },
  attachmentPreview: {
    width: 86,
    height: 86,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attachmentName: {
    marginTop: 4,
    fontFamily: "PublicSans_400Regular",
    fontSize: 11,
    color: COLORS.textMuted,
  },
  attachmentHint: {
    marginTop: 8,
    marginBottom: 2,
    fontFamily: "PublicSans_500Medium",
    fontSize: 10,
    color: COLORS.primary,
  },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  assignBtnText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 13,
    color: COLORS.primaryDark,
  },
  assignWrap: {
    marginBottom: 12,
  },
  assignWrapCompact: {
    marginTop: 8,
  },
  assignSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  assignSelectText: {
    flex: 1,
    marginRight: 8,
    fontFamily: "PublicSans_500Medium",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  assignMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  assignMenuScroll: {
    maxHeight: 160,
  },
  assignOption: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  assignOptionTitle: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  assignOptionSub: {
    marginTop: 1,
    fontFamily: "PublicSans_400Regular",
    fontSize: 11,
    color: COLORS.textMuted,
  },
  assignEmptyText: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  noteBlockLabel: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 6,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    minHeight: 72,
    textAlignVertical: "top",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "PublicSans_400Regular",
    fontSize: 13,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  addNoteBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addNoteBtnDisabled: {
    opacity: 0.4,
  },
  addNoteBtnText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.white,
  },
  removeAssignBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  removeAssignText: {
    fontFamily: "PublicSans_600SemiBold",
    fontSize: 12,
    color: COLORS.maintenance,
  },
  timelineBlock: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
    marginBottom: 4,
  },
  timelineTitle: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  timelineEntry: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  timelineDotCol: {
    alignItems: "center",
    width: 14,
    paddingTop: 3,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.border,
    marginTop: 3,
    marginBottom: -4,
  },
  timelineEntryBody: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineEntryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  timelineDate: {
    fontFamily: "PublicSans_400Regular",
    fontSize: 11,
    color: COLORS.textMuted,
  },
  timelineNote: {
    marginTop: 4,
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  timelineNoNote: {
    marginTop: 4,
    fontFamily: "PublicSans_400Regular",
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 2,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  resolveActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#15803D",
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  resolveActionText: {
    fontFamily: "PublicSans_700Bold",
    fontSize: 13,
    color: COLORS.white,
  },
});
