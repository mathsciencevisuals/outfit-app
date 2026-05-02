import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { PrimaryButton }  from '../../components/PrimaryButton';
import { Screen }         from '../../components/Screen';
import { SectionCard }    from '../../components/SectionCard';
import { mobileApi }      from '../../services/api';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../../utils/theme';

type Tab = 'single' | 'batch';
type BoardOption = { key: string; boardId: string };

// Parses a textarea where each line is: imageUrl | title | description | link
function parseBatchText(raw: string): Array<{ imageUrl: string; title: string; description?: string; link?: string }> {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [imageUrl = '', title = '', description = '', link = ''] = line.split('|').map((s) => s.trim());
      return { imageUrl, title, description: description || undefined, link: link || undefined };
    })
    .filter((p) => p.imageUrl && p.title);
}

export function AdminPinterestPinScreen() {
  const [tab, setTab] = useState<Tab>('single');

  // Board list
  const [boards, setBoards]   = useState<BoardOption[]>([]);
  const [boardKey, setBoardKey] = useState('');

  // Single pin
  const [imageUrl,    setImageUrl]    = useState('');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [link,        setLink]        = useState('');
  const [creating,    setCreating]    = useState(false);
  const [lastResult,  setLastResult]  = useState<{ pinId: string; pinterestUrl: string } | null>(null);

  // Batch
  const [batchText,   setBatchText]   = useState('');
  const [batching,    setBatching]    = useState(false);
  const [batchResult, setBatchResult] = useState<{
    created: number; failed: number;
    results: Array<{ title: string; pinId?: string; error?: string }>;
  } | null>(null);

  useEffect(() => {
    mobileApi.adminGetPinterestBoards()
      .then((data) => {
        const configured = data.filter((b) => b.boardId.trim());
        setBoards(configured);
        if (configured.length > 0) setBoardKey(configured[0].key);
      })
      .catch(() => {});
  }, []);

  const configuredBoards = boards.filter((b) => b.boardId.trim());

  const handleCreate = useCallback(async () => {
    if (!boardKey || !imageUrl.trim() || !title.trim()) {
      Alert.alert('Required', 'Board, Image URL and Title are all required.');
      return;
    }
    setCreating(true);
    setLastResult(null);
    try {
      const result = await mobileApi.adminCreatePin({
        boardKey, imageUrl: imageUrl.trim(), title: title.trim(),
        description: description.trim() || undefined,
        link: link.trim() || undefined,
      });
      setLastResult(result);
      setImageUrl(''); setTitle(''); setDescription(''); setLink('');
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }, [boardKey, imageUrl, title, description, link]);

  const handleBatch = useCallback(async () => {
    const pins = parseBatchText(batchText);
    if (!boardKey) { Alert.alert('Required', 'Select a board first.'); return; }
    if (pins.length === 0) {
      Alert.alert('No pins', 'Each line must be: imageUrl | title | description | link');
      return;
    }
    Alert.alert(
      `Create ${pins.length} pins?`,
      `This will post ${pins.length} pin${pins.length !== 1 ? 's' : ''} to the "${boardKey}" board on Pinterest.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create all',
          onPress: async () => {
            setBatching(true);
            setBatchResult(null);
            try {
              const result = await mobileApi.adminCreatePinsBatch(boardKey, pins);
              setBatchResult(result);
            } catch (err) {
              Alert.alert('Batch failed', err instanceof Error ? err.message : String(err));
            } finally {
              setBatching(false);
            }
          },
        },
      ],
    );
  }, [boardKey, batchText]);

  return (
    <Screen scroll>
      {/* ── Board selector ── */}
      <SectionCard title="Target board" subtitle="Only boards with a configured ID are shown">
        {configuredBoards.length === 0 ? (
          <Text style={styles.emptyText}>No boards configured yet — set board IDs in the Pinterest admin first.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.boardScroll}>
            {configuredBoards.map((b) => (
              <Pressable
                key={b.key}
                style={[styles.boardChip, boardKey === b.key && styles.boardChipActive]}
                onPress={() => setBoardKey(b.key)}
              >
                <Text style={[styles.boardChipText, boardKey === b.key && styles.boardChipTextActive]}>
                  {b.key}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SectionCard>

      {/* ── Tab toggle ── */}
      <View style={styles.tabRow}>
        {(['single', 'batch'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'single' ? 'Single pin' : 'Batch create'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Single pin form ── */}
      {tab === 'single' && (
        <SectionCard title="Pin details">
          <Field label="Image URL *" placeholder="https://…/image.jpg" value={imageUrl} onChangeText={setImageUrl} />
          <Field label="Title *" placeholder="Pastel Kurta Set — Indian Fusion" value={title} onChangeText={setTitle} />
          <Field label="Description" placeholder="Soft pastel kurtas for college days…" value={description} onChangeText={setDescription} multiline />
          <Field label="Link (affiliate URL)" placeholder="https://myntra.com/…" value={link} onChangeText={setLink} />

          <PrimaryButton onPress={handleCreate} loading={creating}>
            Post to Pinterest
          </PrimaryButton>

          {lastResult && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✅ Pin created!</Text>
              <Text style={styles.successSub}>ID: {lastResult.pinId}</Text>
              <Text style={styles.successSub} numberOfLines={1}>{lastResult.pinterestUrl}</Text>
            </View>
          )}
        </SectionCard>
      )}

      {/* ── Batch form ── */}
      {tab === 'batch' && (
        <SectionCard
          title="Batch create"
          subtitle={`One pin per line:\nimageUrl | title | description | link\n\nDescription and link are optional.`}
        >
          <TextInput
            style={styles.batchInput}
            value={batchText}
            onChangeText={setBatchText}
            multiline
            placeholder={`https://…/shirt.jpg | Cotton Kurta | Perfect for college | https://myntra.com/…\nhttps://…/dress.jpg | Floral Midi Dress | Summer vibes`}
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.batchCount}>
            {parseBatchText(batchText).length} valid pin{parseBatchText(batchText).length !== 1 ? 's' : ''} detected
          </Text>

          <PrimaryButton onPress={handleBatch} loading={batching}>
            Create all pins
          </PrimaryButton>

          {batchResult && (
            <View style={styles.batchResultBox}>
              <Text style={styles.batchResultTitle}>
                ✅ {batchResult.created} created  ·  ❌ {batchResult.failed} failed
              </Text>
              {batchResult.results.map((r, i) => (
                <View key={i} style={styles.batchResultRow}>
                  <Text style={[styles.batchResultIcon, r.error && styles.batchResultIconFail]}>
                    {r.error ? '✗' : '✓'}
                  </Text>
                  <View style={styles.batchResultInfo}>
                    <Text style={styles.batchResultTitle2} numberOfLines={1}>{r.title}</Text>
                    {r.error
                      ? <Text style={styles.batchResultError} numberOfLines={2}>{r.error}</Text>
                      : <Text style={styles.batchResultPin}>Pin: {r.pinId}</Text>
                    }
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      )}
    </Screen>
  );
}

function Field({
  label, placeholder, value, onChangeText, multiline,
}: {
  label: string; placeholder: string;
  value: string; onChangeText: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap:       { gap: 4, marginBottom: Spacing.sm },
  label:      { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  input:      { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, backgroundColor: Colors.surface2 },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
});

const styles = StyleSheet.create({
  emptyText:    { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },

  boardScroll:  { marginHorizontal: -Spacing.md },
  boardChip:    { marginLeft: Spacing.md, paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface2, marginBottom: Spacing.xs },
  boardChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryDim },
  boardChipText:   { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  boardChipTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },

  tabRow:      { flexDirection: 'row', backgroundColor: Colors.surface2, borderRadius: Radius.full, padding: 3, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  tab:         { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: Radius.full },
  tabActive:   { backgroundColor: Colors.primary },
  tabText:     { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textMuted },
  tabTextActive: { color: Colors.white, fontWeight: FontWeight.semibold },

  successBox:  { marginTop: Spacing.md, padding: Spacing.md, backgroundColor: '#f0fdf4', borderRadius: Radius.md, gap: 3 },
  successText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: '#16a34a' },
  successSub:  { fontSize: FontSize.xs, color: Colors.textSecondary },

  batchInput:  { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, minHeight: 140, textAlignVertical: 'top', fontSize: FontSize.xs, color: Colors.textPrimary, backgroundColor: Colors.surface2, fontFamily: 'monospace', lineHeight: 18 },
  batchCount:  { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', marginBottom: Spacing.sm },

  batchResultBox:   { marginTop: Spacing.md, gap: Spacing.xs },
  batchResultTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: 4 },
  batchResultRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, paddingVertical: 3 },
  batchResultIcon:  { fontSize: 14, color: '#16a34a', width: 16 },
  batchResultIconFail: { color: Colors.error },
  batchResultInfo:  { flex: 1 },
  batchResultTitle2: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  batchResultError:  { fontSize: FontSize.xs, color: Colors.error },
  batchResultPin:    { fontSize: FontSize.xs, color: Colors.textMuted },
});
