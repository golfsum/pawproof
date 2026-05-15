import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { TabsHeader } from '@/components/TabsHeader';
import { Chip } from '@/components/Chip';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { useGate } from '@/hooks/useGate';
import { deleteVaccine } from '@/lib/firestore';
import { canonicalizeVaccineName } from '@/utils/vaccineNames';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import { fmtDate, daysUntil } from '@/utils/dates';
import type { PetDocument, VaccineRecord, Pet, JournalEntry } from '@/types/models';
import { PetAvatar } from '@/components/PetAvatar';

const PREVIEW_LIMIT = 5;
type ViewAllState = { petId: string; kind: 'vaccines' | 'documents' } | null;
type KindFilter = 'all' | 'vaccines' | 'documents';

export default function RecordsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { pets, vaccines, documents, entries } = useData();
  const { check, isPremium, ocrTrialAvailable } = useGate();

  const [search, setSearch] = useState('');
  const [viewAll, setViewAll] = useState<ViewAllState>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [petFilter, setPetFilter] = useState<string | null>(null);
  // Track collapsed pet IDs so multi-pet accounts can fold sections shut —
  // mirrors the pattern used in Reminders.
  const [collapsedPets, setCollapsedPets] = useState<Set<string>>(new Set());
  const togglePet = (petId: string) =>
    setCollapsedPets(prev => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });

  const filtersActive = kindFilter !== 'all' || petFilter !== null;

  const handleDeleteVaccine = (vaccineId: string, vaccineName: string) => {
    if (!user) return;
    Alert.alert('Delete vaccine?', `Remove ${vaccineName} from records.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteVaccine(user.uid, vaccineId) },
    ]);
  };

  // Cross-pet urgency strip at the top.
  const expiring = useMemo(
    () => vaccines.filter(v => v.expirationDate && (daysUntil(v.expirationDate) ?? 999) <= 60),
    [vaccines],
  );

  // Group vaccines + documents by pet. Each pet's items are sorted by most
  // recent first so the preview shows the freshest entries. Filters here are
  // applied at the source so the pet header counts reflect what the user is
  // currently looking at.
  const petGroups = useMemo(() => {
    return pets
      .filter(p => (petFilter ? p.id === petFilter : true))
      .map(pet => {
        const petVaccines =
          kindFilter === 'documents'
            ? []
            : vaccines
                .filter(v => v.petId === pet.id)
                .sort((a, b) => +new Date(b.dateGiven) - +new Date(a.dateGiven));
        const petDocs =
          kindFilter === 'vaccines'
            ? []
            : documents
                .filter(d => d.petId === pet.id)
                .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        return { pet, vaccines: petVaccines, documents: petDocs };
      })
      .filter(g => g.vaccines.length > 0 || g.documents.length > 0);
  }, [pets, vaccines, documents, kindFilter, petFilter]);

  const q = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return null;
    const petMatches = pets.filter(p => p.name.toLowerCase().includes(q));
    const vaccineMatches = vaccines.filter(
      v =>
        v.vaccineName.toLowerCase().includes(q) ||
        (v.clinicName ?? '').toLowerCase().includes(q) ||
        (v.notes ?? '').toLowerCase().includes(q),
    );
    const docMatches = documents.filter(
      d => d.title.toLowerCase().includes(q) || (d.ocrText ?? '').toLowerCase().includes(q),
    );
    const entryMatches = entries.filter(
      e => e.title.toLowerCase().includes(q) || (e.note ?? '').toLowerCase().includes(q),
    );
    return { petMatches, vaccineMatches, docMatches, entryMatches };
  }, [q, pets, vaccines, documents, entries]);

  const handleSmartScan = () => {
    if (check('ocr_scan')) router.push('/document/scan');
  };

  const handleAddVaccine = () => {
    if (pets.length === 0) {
      Alert.alert('Add a pet first', 'You need at least one pet on file to add vaccines.', [
        { text: 'Add pet', onPress: () => router.push('/pet/add') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    router.push('/vaccine/add');
  };

  // Compute the data the "View all" modal needs from current state.
  const modalData = useMemo(() => {
    if (!viewAll) return null;
    const group = petGroups.find(g => g.pet.id === viewAll.petId);
    if (!group) return null;
    return {
      pet: group.pet,
      kind: viewAll.kind,
      items: viewAll.kind === 'vaccines' ? group.vaccines : group.documents,
    };
  }, [viewAll, petGroups]);

  return (
    <Screen>
      <TabsHeader />
      <View style={styles.header}>
        <Text style={typography.h1}>Records</Text>
        <Pressable
          onPress={() => setFilterOpen(true)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.filterBtn,
            filtersActive && styles.filterBtnActive,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={filtersActive ? colors.primary : colors.text}
          />
          {filtersActive ? <View style={styles.filterDot} /> : null}
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textFaint} />
        <TextInput
          placeholder="Search vaccines, vet visits, documents…"
          placeholderTextColor={colors.textFaint}
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {q ? (
          <SearchResults matches={matches!} pets={pets} onDeleteVaccine={handleDeleteVaccine} />
        ) : (
          <>
            <View style={styles.quickRow}>
              <QuickAdd
                label="Scan Document"
                icon="scan-outline"
                tint={colors.primary}
                onPress={handleSmartScan}
                badge={isPremium || ocrTrialAvailable ? undefined : 'Plus'}
              />
              <QuickAdd label="Add Vaccine Record" icon="shield-checkmark-outline" tint={colors.success} onPress={handleAddVaccine} />
            </View>

            {filtersActive ? (
              <ActiveFilterBar
                kindFilter={kindFilter}
                petFilter={petFilter}
                pets={pets}
                onClear={() => { setKindFilter('all'); setPetFilter(null); }}
              />
            ) : null}

            {!filtersActive && expiring.length > 0 && (
              <>
                <SectionHeader title={`Expiring Soon (${expiring.length})`} />
                <View style={{ paddingHorizontal: spacing.base, gap: spacing.sm }}>
                  {expiring.map(v => (
                    <VaccineCard
                      key={v.id}
                      record={v}
                      pet={pets.find(p => p.id === v.petId)}
                      onDelete={handleDeleteVaccine}
                    />
                  ))}
                </View>
              </>
            )}

            {petGroups.length === 0 ? (
              <View style={{ padding: spacing.base, marginTop: spacing.lg }}>
                {filtersActive ? (
                  <EmptyState
                    icon="filter-outline"
                    title="No records match these filters"
                    body="Try clearing a filter or switching to a different pet."
                    cta={{ label: 'Clear filters', icon: 'close-outline', onPress: () => { setKindFilter('all'); setPetFilter(null); } }}
                  />
                ) : (
                  <EmptyState
                    icon="folder-open-outline"
                    title="No records yet"
                    body="Tap Scan Document to OCR a vaccine record or invoice, or Add vaccine to enter one by hand."
                    cta={{ label: 'Scan Document', icon: 'scan-outline', onPress: handleSmartScan }}
                  />
                )}
              </View>
            ) : (
              <>
                {petGroups.map(group => (
                  <PetSection
                    key={group.pet.id}
                    pet={group.pet}
                    vaccines={group.vaccines}
                    documents={group.documents}
                    collapsed={collapsedPets.has(group.pet.id)}
                    onToggle={() => togglePet(group.pet.id)}
                    onDeleteVaccine={handleDeleteVaccine}
                    onViewAll={kind => setViewAll({ petId: group.pet.id, kind })}
                  />
                ))}
                {!filtersActive ? <OcrHintCard onScan={handleSmartScan} /> : null}
              </>
            )}
          </>
        )}
      </ScrollView>

      <ViewAllModal
        data={modalData}
        onClose={() => setViewAll(null)}
        onDeleteVaccine={handleDeleteVaccine}
      />

      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        kindFilter={kindFilter}
        petFilter={petFilter}
        pets={pets}
        onChangeKind={setKindFilter}
        onChangePet={setPetFilter}
        onClear={() => { setKindFilter('all'); setPetFilter(null); }}
      />
    </Screen>
  );
}

// ─── OCR hint card ───────────────────────────────────────────────────

// A subtle "did you know?" card that sits below the per-pet sections to
// surface the OCR feature when the user has already added some records.
// Keeps the bottom of the screen feeling intentional instead of empty.
function OcrHintCard({ onScan }: { onScan: () => void }) {
  return (
    <Pressable
      onPress={onScan}
      style={({ pressed }) => [styles.hintCard, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.hintIcon}>
        <Ionicons name="scan-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.hintTitle}>Scan a vaccine record</Text>
        <Text style={styles.hintBody}>
          We'll pull out dates, vaccines, and clinic info automatically — no typing required.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

// ─── Per-pet section ──────────────────────────────────────────────────

function PetSection({
  pet, vaccines, documents, collapsed, onToggle, onDeleteVaccine, onViewAll,
}: {
  pet: Pet;
  vaccines: VaccineRecord[];
  documents: PetDocument[];
  collapsed: boolean;
  onToggle: () => void;
  onDeleteVaccine: (id: string, name: string) => void;
  onViewAll: (kind: 'vaccines' | 'documents') => void;
}) {
  return (
    <View style={styles.petSection}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.petHeader, pressed && { opacity: 0.85 }]}
      >
        <PetAvatar pet={pet} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.petHeaderName}>{pet.name}</Text>
          <Text style={styles.petHeaderSub}>
            {vaccines.length} {vaccines.length === 1 ? 'vaccine' : 'vaccines'}
            {' · '}
            {documents.length} {documents.length === 1 ? 'document' : 'documents'}
          </Text>
        </View>
        <Ionicons
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={colors.textFaint}
        />
      </Pressable>

      {collapsed ? null : (
        <>
          {vaccines.length > 0 ? (
            <>
              <SubgroupHeader
                label="Vaccinations"
                count={vaccines.length}
                showViewAll={vaccines.length > PREVIEW_LIMIT}
                onViewAll={() => onViewAll('vaccines')}
              />
              <View style={styles.list}>
                {vaccines.slice(0, PREVIEW_LIMIT).map(v => (
                  <VaccineCard key={v.id} record={v} pet={pet} onDelete={onDeleteVaccine} />
                ))}
              </View>
            </>
          ) : null}

          {documents.length > 0 ? (
            <>
              <SubgroupHeader
                label="Documents"
                count={documents.length}
                showViewAll={documents.length > PREVIEW_LIMIT}
                onViewAll={() => onViewAll('documents')}
              />
              <View style={styles.list}>
                {documents.slice(0, PREVIEW_LIMIT).map(d => (
                  <DocumentCard key={d.id} doc={d} pet={pet} />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

function SubgroupHeader({
  label, count, showViewAll, onViewAll,
}: {
  label: string;
  count: number;
  showViewAll: boolean;
  onViewAll: () => void;
}) {
  return (
    <View style={styles.subgroupHeader}>
      <Text style={styles.subgroupLabel}>
        {label} · {count}
      </Text>
      {showViewAll ? (
        <Pressable onPress={onViewAll} hitSlop={8}>
          <Text style={styles.viewAllLink}>View all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Active filter chip strip ────────────────────────────────────────

function ActiveFilterBar({
  kindFilter, petFilter, pets, onClear,
}: {
  kindFilter: KindFilter;
  petFilter: string | null;
  pets: Pet[];
  onClear: () => void;
}) {
  const petName = petFilter ? pets.find(p => p.id === petFilter)?.name : null;
  const parts: string[] = [];
  if (kindFilter === 'vaccines') parts.push('Vaccinations');
  else if (kindFilter === 'documents') parts.push('Documents');
  if (petName) parts.push(petName);
  return (
    <View style={styles.activeFilterRow}>
      <Ionicons name="funnel" size={14} color={colors.primary} />
      <Text style={styles.activeFilterText}>Showing {parts.join(' · ')}</Text>
      <Pressable onPress={onClear} hitSlop={8}>
        <Text style={styles.clearLink}>Clear</Text>
      </Pressable>
    </View>
  );
}

// ─── Filter sheet ────────────────────────────────────────────────────

function FilterSheet({
  visible, onClose, kindFilter, petFilter, pets, onChangeKind, onChangePet, onClear,
}: {
  visible: boolean;
  onClose: () => void;
  kindFilter: KindFilter;
  petFilter: string | null;
  pets: Pet[];
  onChangeKind: (k: KindFilter) => void;
  onChangePet: (id: string | null) => void;
  onClear: () => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetGrabber} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter records</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.sheetClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xl, gap: spacing.lg }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.sheetLabel}>Show</Text>
              <View style={styles.chipRow}>
                <Chip label="All" selected={kindFilter === 'all'} onPress={() => onChangeKind('all')} />
                <Chip label="Vaccinations" icon="shield-checkmark-outline" selected={kindFilter === 'vaccines'} tone="success" onPress={() => onChangeKind('vaccines')} />
                <Chip label="Documents" icon="document-text-outline" selected={kindFilter === 'documents'} tone="warning" onPress={() => onChangeKind('documents')} />
              </View>
            </View>

            {pets.length > 1 ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.sheetLabel}>Pet</Text>
                <View style={styles.chipRow}>
                  <Chip label="All pets" selected={petFilter === null} onPress={() => onChangePet(null)} />
                  {pets.map(p => (
                    <Chip
                      key={p.id}
                      label={p.name}
                      selected={petFilter === p.id}
                      onPress={() => onChangePet(p.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.sheetFooter}>
              <Pressable onPress={onClear} style={({ pressed }) => [styles.sheetClearBtn, pressed && { opacity: 0.85 }]}>
                <Text style={styles.sheetClearText}>Reset</Text>
              </Pressable>
              <Pressable onPress={onClose} style={({ pressed }) => [styles.sheetApplyBtn, pressed && { opacity: 0.9 }]}>
                <Text style={styles.sheetApplyText}>Done</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── View all modal ───────────────────────────────────────────────────

function ViewAllModal({
  data, onClose, onDeleteVaccine,
}: {
  data: { pet: Pet; kind: 'vaccines' | 'documents'; items: VaccineRecord[] | PetDocument[] } | null;
  onClose: () => void;
  onDeleteVaccine: (id: string, name: string) => void;
}) {
  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={data !== null} onRequestClose={onClose}>
      {data ? (
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} hitSlop={10} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.modalTitle}>
                {data.pet.name} · {data.kind === 'vaccines' ? 'Vaccinations' : 'Documents'}
              </Text>
              <Text style={styles.modalSub}>{data.items.length} on file</Text>
            </View>
            <View style={{ width: 30 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {data.kind === 'vaccines'
              ? (data.items as VaccineRecord[]).map(v => (
                  <VaccineCard key={v.id} record={v} pet={data.pet} onDelete={onDeleteVaccine} />
                ))
              : (data.items as PetDocument[]).map(d => (
                  <DocumentCard key={d.id} doc={d} pet={data.pet} />
                ))}
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

// ─── Row components ──────────────────────────────────────────────────

function QuickAdd({
  label, icon, tint, onPress, badge,
}: { label: string; icon: keyof typeof Ionicons.glyphMap; tint: string; onPress: () => void; badge?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.85 }]}>
      <View style={[styles.quickIcon, { backgroundColor: tint + '22' }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function VaccineCard({ record, pet, onDelete }: { record: VaccineRecord; pet?: Pet; onDelete?: (id: string, name: string) => void }) {
  const router = useRouter();
  const days = record.expirationDate ? daysUntil(record.expirationDate) : null;
  let badge: { tone: 'success' | 'warning' | 'danger'; label: string } | null = null;
  if (days != null) {
    if (days < 0) badge = { tone: 'danger', label: 'Expired' };
    else if (days <= 30) badge = { tone: 'warning', label: `${days}d left` };
    else badge = { tone: 'success', label: `${days}d` };
  }
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/vaccine/edit/[id]', params: { id: record.id } })}
      onLongPress={onDelete ? () => onDelete(record.id, record.vaccineName) : undefined}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.successSoft }]}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{canonicalizeVaccineName(record.vaccineName)}</Text>
        <Text style={styles.rowSub}>
          {pet?.name ?? '—'}
          {record.expirationDate ? ` · Expires ${fmtDate(record.expirationDate)}` : ''}
          {' · '}Given {fmtDate(record.dateGiven)}
        </Text>
      </View>
      {badge && (
        <View style={[styles.expirationBadge, badgeTone(badge.tone)]}>
          <Text style={[styles.expirationText, badgeToneText(badge.tone)]}>{badge.label}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={14} color={colors.textFaint} style={{ marginLeft: 4 }} />
    </Pressable>
  );
}

function DocumentCard({ doc, pet }: { doc: PetDocument; pet?: Pet }) {
  const router = useRouter();
  const isImage = doc.fileType?.startsWith('image/');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/document/[id]', params: { id: doc.id } })}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.docThumb}>
        {isImage ? (
          <Image source={{ uri: doc.fileUrl }} style={{ width: 44, height: 44, borderRadius: 10 }} contentFit="cover" />
        ) : (
          <Ionicons name="document-text-outline" size={20} color={colors.accent} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{doc.title}</Text>
        <Text style={styles.rowSub}>{pet?.name ?? '—'} · {fmtDate(doc.createdAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

// ─── Search ──────────────────────────────────────────────────────────

interface SearchMatches {
  petMatches: Pet[];
  vaccineMatches: VaccineRecord[];
  docMatches: PetDocument[];
  entryMatches: JournalEntry[];
}

function SearchResults({
  matches, pets, onDeleteVaccine,
}: {
  matches: SearchMatches;
  pets: Pet[];
  onDeleteVaccine: (id: string, name: string) => void;
}) {
  const { petMatches, vaccineMatches, docMatches, entryMatches } = matches;
  if (
    petMatches.length === 0 &&
    vaccineMatches.length === 0 &&
    docMatches.length === 0 &&
    entryMatches.length === 0
  ) {
    return (
      <View style={{ paddingTop: spacing.lg }}>
        <EmptyState icon="search-outline" title="No matches" body="Try a different search term." />
      </View>
    );
  }
  return (
    <View>
      {petMatches.length > 0 && (
        <>
          <SectionHeader title="Pets" />
          <View style={{ paddingHorizontal: spacing.base, gap: spacing.sm }}>
            {petMatches.map((p: Pet) => (
              <View key={p.id} style={styles.row}>
                <PetAvatar pet={p} size={36} />
                <Text style={styles.rowTitle}>{p.name}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      {vaccineMatches.length > 0 && (
        <>
          <SectionHeader title="Vaccines" />
          <View style={{ paddingHorizontal: spacing.base, gap: spacing.sm }}>
            {vaccineMatches.map((v: VaccineRecord) => (
              <VaccineCard key={v.id} record={v} pet={pets.find(p => p.id === v.petId)} onDelete={onDeleteVaccine} />
            ))}
          </View>
        </>
      )}
      {docMatches.length > 0 && (
        <>
          <SectionHeader title="Documents" />
          <View style={{ paddingHorizontal: spacing.base, gap: spacing.sm }}>
            {docMatches.map((d: PetDocument) => (
              <DocumentCard key={d.id} doc={d} pet={pets.find(p => p.id === d.petId)} />
            ))}
          </View>
        </>
      )}
      {entryMatches.length > 0 && (
        <>
          <SectionHeader title="Timeline" />
          <View style={{ paddingHorizontal: spacing.base, gap: spacing.sm }}>
            {entryMatches.slice(0, 25).map((e: JournalEntry) => (
              <View key={e.id} style={styles.row}>
                <View style={styles.rowIcon}><Ionicons name="reader-outline" size={18} color={colors.textMuted} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{e.title}</Text>
                  {e.note ? <Text style={styles.rowSub} numberOfLines={2}>{e.note}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function badgeTone(tone: 'success' | 'warning' | 'danger') {
  return {
    backgroundColor:
      tone === 'success' ? colors.successSoft : tone === 'warning' ? colors.warningSoft : colors.dangerSoft,
  };
}
function badgeToneText(tone: 'success' | 'warning' | 'danger') {
  return {
    color: tone === 'success' ? '#1E6C80' : tone === 'warning' ? '#92400e' : '#991b1b',
  };
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Compact filter button — keeps the title row clean; turns primary-tinted
  // when filters are applied so the user can spot it at a glance.
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },

  searchWrap: {
    marginHorizontal: spacing.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: { flex: 1, color: colors.text, fontSize: 14 },
  quickRow: { paddingHorizontal: spacing.base, paddingTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
  quickCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
    gap: 8,
    position: 'relative',
  },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.text },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

  // Active filter chip strip — gives the user a single-tap way to clear
  // without re-opening the sheet.
  activeFilterRow: {
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  activeFilterText: { flex: 1, fontSize: 13, color: colors.primary, fontFamily: fonts.body.semibold },
  clearLink: { fontSize: 13, color: colors.primary, fontFamily: fonts.body.semibold, textDecorationLine: 'underline' },

  // Per-pet section, mirrors the Reminders pet-grouped layout.
  petSection: {
    marginTop: spacing['2xl'],
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  petHeaderName: { fontSize: 18, fontFamily: fonts.display.bold, color: colors.text, letterSpacing: -0.2 },
  petHeaderSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

  subgroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: 6,
  },
  subgroupLabel: {
    fontSize: 11,
    fontFamily: fonts.body.semibold,
    letterSpacing: 0.6,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  viewAllLink: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.primary },

  list: { paddingHorizontal: spacing.base, gap: spacing.sm },

  // Subtle OCR hint that follows the last pet section.
  hintCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  hintIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintTitle: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.primaryDark },
  hintBody: { fontSize: 12, color: colors.primaryDark, marginTop: 2, lineHeight: 17, opacity: 0.85 },

  // Row components shared across previews + view-all modal
  row: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardSubtle },
  rowTitle: { fontSize: 15, fontFamily: fonts.body.semibold, color: colors.text },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  docThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    overflow: 'hidden',
  },
  expirationBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  expirationText: { fontSize: 11, fontWeight: '700' },

  // View all modal
  modalContainer: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalClose: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.cardSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontFamily: fonts.display.bold, color: colors.text },
  modalSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  modalScroll: { paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing['3xl'], gap: spacing.sm },

  // Bottom-sheet filter
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontFamily: fonts.display.bold, color: colors.text },
  sheetClose: { padding: 4 },
  sheetLabel: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  sheetClearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sheetClearText: { fontSize: 14, color: colors.text, fontFamily: fonts.body.semibold },
  sheetApplyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  sheetApplyText: { fontSize: 14, color: '#fff', fontFamily: fonts.body.semibold },
});
