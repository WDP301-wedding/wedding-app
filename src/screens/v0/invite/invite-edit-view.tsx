import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LockIcon, RotateCcwIcon } from '@/components/v0-primitives';
import type { AppDesignView } from '@/features/invitation-studio/app-invitation-api';
import { useWeddingTheme } from '@/theme';
import { styles } from './invite.styles';

export interface ConflictState {
  readonly hasConflict: boolean;
  readonly serverRevision: number | null;
  readonly clientRevision: number;
  readonly serverDesign: AppDesignView | null;
}

export function InviteEditView({
  selectedDesign,
  conflictState,
  editError,
  groomName,
  setGroomName,
  brideName,
  setBrideName,
  greeting,
  setGreeting,
  message,
  setMessage,
  footer,
  setFooter,
  saving,
  onBack,
  onAcceptServerVersion,
  onReapplyOnServerVersion,
  onSave,
}: {
  selectedDesign: AppDesignView | null;
  conflictState: ConflictState | null;
  editError: string | null;
  groomName: string;
  setGroomName: (val: string) => void;
  brideName: string;
  setBrideName: (val: string) => void;
  greeting: string;
  setGreeting: (val: string) => void;
  message: string;
  setMessage: (val: string) => void;
  footer: string;
  setFooter: (val: string) => void;
  saving: boolean;
  onBack: () => void;
  onAcceptServerVersion: () => void;
  onReapplyOnServerVersion: () => void;
  onSave: () => void;
}) {
  const { tokens } = useWeddingTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại thiệp"
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>
            Phiên bản {selectedDesign?.revisionNumber ?? 1}
          </Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Chỉnh sửa nội dung</Text>
        </View>
      </View>

      {conflictState?.hasConflict ? (
        <View
          style={[
            {
              backgroundColor: tokens.tagWarmBg,
              borderColor: tokens.tagWarmText,
              padding: 16,
              borderRadius: 8,
              borderWidth: 1,
              marginBottom: 16,
            },
          ]}
        >
          <Text style={{ fontWeight: '700', color: tokens.tagWarmText, fontSize: 14 }}>
            Xung đột phiên bản (409 Conflict)
          </Text>
          <Text style={{ color: tokens.text, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
            {conflictState.serverRevision !== null
              ? `Máy chủ hiện đang ở phiên bản #${conflictState.serverRevision} (bản bạn đang sửa dựa trên phiên bản #${conflictState.clientRevision}).`
              : `Máy chủ đã có phiên bản mới hơn phiên bản #${conflictState.clientRevision} của bạn (chưa thể tải số phiên bản chính xác do kết nối).`}{' '}
            Nội dung bạn vừa nhập vẫn được giữ nguyên bên dưới. Bạn có thể xem bản máy chủ hoặc xác
            nhận lưu đè nội dung của mình lên phiên bản mới.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem bản máy chủ"
              onPress={onAcceptServerVersion}
              style={[
                styles.outlineButton,
                { flex: 1, borderColor: tokens.rule, paddingVertical: 8 },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: tokens.text,
                  textAlign: 'center',
                }}
              >
                Xem bản máy chủ
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xác nhận lưu đè"
              onPress={onReapplyOnServerVersion}
              style={[
                styles.primaryButton,
                { flex: 1, backgroundColor: tokens.primary, paddingVertical: 8 },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: tokens.onPrimary,
                  textAlign: 'center',
                }}
              >
                Xác nhận lưu đè
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {editError ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.revisionAlert,
            {
              backgroundColor: tokens.tagWarmBg,
              borderColor: tokens.champagne,
              marginBottom: 12,
            },
          ]}
        >
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{editError}</Text>
        </View>
      ) : null}

      <View
        style={[
          styles.revisionAlert,
          { backgroundColor: tokens.revisionAlertBg, borderColor: tokens.sage },
        ]}
      >
        <RotateCcwIcon size={18} color={tokens.sage} />
        <View style={styles.revisionAlertText}>
          <Text style={[styles.revisionAlertTitle, { color: tokens.sage }]}>Chỉnh sửa văn bản</Text>
          <Text style={[styles.revisionAlertDesc, { color: tokens.muted }]}>
            Thiết kế và bố cục được giữ nguyên theo chuẩn xưởng in.
          </Text>
        </View>
      </View>

      <View style={styles.formFields}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: tokens.primary }]}>Tên chú rể</Text>
          <TextInput
            value={groomName}
            onChangeText={setGroomName}
            placeholder="Tên chú rể"
            placeholderTextColor={tokens.muted}
            accessibilityLabel="Tên chú rể"
            style={[
              styles.input,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.rule,
                color: tokens.text,
              },
            ]}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: tokens.primary }]}>Tên cô dâu</Text>
          <TextInput
            value={brideName}
            onChangeText={setBrideName}
            placeholder="Tên cô dâu"
            placeholderTextColor={tokens.muted}
            accessibilityLabel="Tên cô dâu"
            style={[
              styles.input,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.rule,
                color: tokens.text,
              },
            ]}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: tokens.primary }]}>Lời chào</Text>
          <TextInput
            value={greeting}
            onChangeText={setGreeting}
            placeholder="Lời chào mở đầu"
            placeholderTextColor={tokens.muted}
            accessibilityLabel="Lời chào mở đầu"
            style={[
              styles.input,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.rule,
                color: tokens.text,
              },
            ]}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: tokens.primary }]}>Lời nhắn</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            placeholder="Lời nhắn gửi khách mời"
            placeholderTextColor={tokens.muted}
            accessibilityLabel="Lời nhắn gửi khách mời"
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.rule,
                color: tokens.text,
              },
            ]}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: tokens.primary }]}>Chân trang / Lời cảm ơn</Text>
          <TextInput
            value={footer}
            onChangeText={setFooter}
            placeholder="Chân trang"
            placeholderTextColor={tokens.muted}
            accessibilityLabel="Chân trang"
            style={[
              styles.input,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.rule,
                color: tokens.text,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.saveNote}>
        <LockIcon size={14} color={tokens.sage} />
        <Text style={[styles.saveNoteText, { color: tokens.muted }]}>
          Lưu thay đổi sẽ tạo một bản chỉnh sửa mới trên máy chủ.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lưu bản chỉnh sửa"
        disabled={saving}
        onPress={onSave}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: tokens.primary,
            borderColor: tokens.primary,
            opacity: pressed || saving ? 0.8 : 1,
          },
        ]}
      >
        {saving ? (
          <ActivityIndicator color={tokens.onPrimary} size="small" />
        ) : (
          <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>
            Lưu bản chỉnh sửa
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
