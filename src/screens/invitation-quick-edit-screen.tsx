import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type {
  AppInvitationGateway,
  AppDesignView,
  AppPrintOrderView,
} from '../features/invitation-studio/app-invitation-api';

export interface InvitationQuickEditScreenProps {
  readonly accessToken: string;
  readonly bookingId: string;
  readonly gateway: AppInvitationGateway;
  readonly initialDesign?: AppDesignView | null;
  readonly initialOrders?: readonly AppPrintOrderView[];
}

export function InvitationQuickEditScreen({
  accessToken,
  bookingId,
  gateway,
  initialDesign = null,
  initialOrders = [],
}: InvitationQuickEditScreenProps) {
  const [design, setDesign] = useState<AppDesignView | null>(initialDesign);
  const [brideName, setBrideName] = useState(initialDesign?.textFields?.brideName ?? '');
  const [groomName, setGroomName] = useState(initialDesign?.textFields?.groomName ?? '');
  const [greeting, setGreeting] = useState(initialDesign?.textFields?.greeting ?? '');
  const [message, setMessage] = useState(initialDesign?.textFields?.message ?? '');
  const [footer, setFooter] = useState(initialDesign?.textFields?.footer ?? '');

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    if (!design) {
      setNotice({ type: 'error', text: 'Chưa có bản thiết kế thiệp để chỉnh sửa.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const updated = await gateway.quickEditTextFields(
        accessToken,
        bookingId,
        design.designId,
        design.revisionNumber,
        {
          brideName,
          groomName,
          greeting,
          message,
          footer,
        },
      );
      setDesign(updated);
      setNotice({
        type: 'success',
        text: `Đã lưu chỉnh sửa thành công (Bản ${updated.revisionNumber})!`,
      });
    } catch (err: unknown) {
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Lỗi lưu thiệp.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Chỉnh Sửa Nhanh Thiệp Cưới</Text>
        <Text style={styles.subtitle}>
          Cập nhật thông tin cặp đôi và lời mời trên thiệp cưới di động.
        </Text>
      </View>

      {notice && (
        <View
          accessibilityRole="alert"
          style={[
            styles.notice,
            notice.type === 'success' ? styles.noticeSuccess : styles.noticeError,
          ]}
        >
          <Text
            style={notice.type === 'success' ? styles.noticeTextSuccess : styles.noticeTextError}
          >
            {notice.text}
          </Text>
        </View>
      )}

      {/* Live Preview Card */}
      <View style={styles.cardPreview} accessibilityLabel="Xem trước thiệp cưới">
        <Text style={styles.previewOverline}>THIỆP CƯỚI BÁO HỶ</Text>
        <Text style={styles.previewGreeting}>{greeting}</Text>
        <View style={styles.coupleRow}>
          <Text style={styles.previewGroom}>{groomName || 'Chú Rể'}</Text>
          <Text style={styles.previewAmpersand}>&amp;</Text>
          <Text style={styles.previewBride}>{brideName || 'Cô Dâu'}</Text>
        </View>
        <Text style={styles.previewMessage}>{message}</Text>
        {footer ? <Text style={styles.previewFooter}>{footer}</Text> : null}
      </View>

      {/* Quick Edit Inputs */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Thông Tin Thiệp Mời</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên Chú Rể</Text>
          <TextInput
            value={groomName}
            onChangeText={setGroomName}
            placeholder="Nhập tên chú rể"
            style={styles.input}
            accessibilityLabel="Tên chú rể"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên Cô Dâu</Text>
          <TextInput
            value={brideName}
            onChangeText={setBrideName}
            placeholder="Nhập tên cô dâu"
            style={styles.input}
            accessibilityLabel="Tên cô dâu"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lời Chào Mời</Text>
          <TextInput
            value={greeting}
            onChangeText={setGreeting}
            placeholder="VD: Trân trọng kính mời quý khách"
            style={styles.input}
            accessibilityLabel="Lời chào mời"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nội Dung Lời Nhắn</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Nhập lời nhắn gửi đến khách mời"
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea]}
            accessibilityLabel="Nội dung lời nhắn"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Chân Trang / Lời Cảm Ơn</Text>
          <TextInput
            value={footer}
            onChangeText={setFooter}
            placeholder="VD: Sự hiện diện của bạn là niềm vinh hạnh"
            style={styles.input}
            accessibilityLabel="Chân trang lời cảm ơn"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lưu chỉnh sửa thiệp"
          onPress={() => {
            void handleSave();
          }}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
            saving && styles.saveButtonDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#FAF8F5" />
          ) : (
            <Text style={styles.saveButtonText}>Lưu Thay Đổi</Text>
          )}
        </Pressable>
      </View>

      {/* Orders Section */}
      {initialOrders.length > 0 && (
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Tình Trạng Đơn In Ấn</Text>
          {initialOrders.map((ord) => (
            <View key={ord.orderId} style={styles.orderRow}>
              <View>
                <Text style={styles.orderId}>Đơn in #{ord.orderId.slice(0, 8)}</Text>
                <Text style={styles.orderSub}>Phiên bản: {ord.revision}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{ord.status}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#334537',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#62645F',
  },
  notice: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  noticeSuccess: {
    backgroundColor: '#E8F5E9',
  },
  noticeError: {
    backgroundColor: '#FFEBEE',
  },
  noticeTextSuccess: {
    color: '#2E7D32',
    fontSize: 14,
  },
  noticeTextError: {
    color: '#C62828',
    fontSize: 14,
  },
  cardPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  previewOverline: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#8C6D62',
    fontWeight: '600',
    marginBottom: 8,
  },
  previewGreeting: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#52796F',
    marginBottom: 12,
  },
  coupleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1E5CE',
    width: '100%',
    justifyContent: 'center',
  },
  previewGroom: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334537',
  },
  previewAmpersand: {
    fontSize: 16,
    color: '#C5A880',
    marginHorizontal: 12,
  },
  previewBride: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334537',
  },
  previewMessage: {
    fontSize: 13,
    color: '#62645F',
    textAlign: 'center',
    marginTop: 8,
  },
  previewFooter: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 12,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#232321',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#52796F',
    marginBottom: 6,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#D7D4CC',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#232321',
    backgroundColor: '#FAF8F5',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  saveButton: {
    minHeight: 48,
    backgroundColor: '#334537',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonPressed: {
    backgroundColor: '#28312A',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FAF8F5',
    fontSize: 15,
    fontWeight: '600',
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#232321',
  },
  orderSub: {
    fontSize: 12,
    color: '#62645F',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2E7D32',
  },
});
