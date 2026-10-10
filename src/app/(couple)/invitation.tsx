import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { createAppInvitationGateway } from "@/features/invitation-studio/app-invitation-api";
import {
  AndroidIdentitySession,
  createIdentityApi,
  createSecureRefreshStore,
  type AndroidSessionSnapshot,
} from "@/features/identity-access/session";
import { InvitationQuickEditScreen } from "@/screens/invitation-quick-edit-screen";
import { useWeddingTheme } from "@/theme";

const deviceSession = new AndroidIdentitySession(createIdentityApi(), createSecureRefreshStore());
const gateway = createAppInvitationGateway();

export default function CoupleInvitationRoute({
  session = deviceSession,
}: Readonly<{ session?: AndroidIdentitySession }>) {
  const { colors, brand } = useWeddingTheme();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const [snapshot, setSnapshot] = useState<AndroidSessionSnapshot>(() => session.snapshot());
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const bookingId = (params.bookingId as string | undefined) ?? "";

  useEffect(() => {
    let active = true;
    void (async () => {
      const nextSnapshot = await session.restore();
      if (!active) return;
      setSnapshot(nextSnapshot);
      if (nextSnapshot.status === "authenticated" && nextSnapshot.access !== "denied") {
        try {
          const accessToken = await session.authorize((tok) => Promise.resolve(tok));
          if (!active) return;
          setToken(accessToken);
        } catch {
          // Token retrieval failed
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [session]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={brand.primary} />
        <Text style={{ marginTop: 12, color: colors.secondaryLabel }}>Đang kết nối phiên thiệp cưới…</Text>
      </View>
    );
  }

  if (snapshot.status === "anonymous" || snapshot.access === "denied" || !token) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: brand.display, marginBottom: 8 }}>Yêu cầu đăng nhập</Text>
        <Text style={{ textAlign: "center", color: colors.secondaryLabel }}>
          Vui lòng đăng nhập với tài khoản dâu rể để truy cập tính năng chỉnh sửa nhanh thiệp cưới.
        </Text>
      </View>
    );
  }

  if (!bookingId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: brand.display, marginBottom: 8 }}>Chưa chọn tiệc cưới</Text>
        <Text style={{ textAlign: "center", color: colors.secondaryLabel }}>
          Không tìm thấy mã tiệc cưới tương ứng. Vui lòng mở từ trang chi tiết tiệc cưới.
        </Text>
      </View>
    );
  }

  return (
    <InvitationQuickEditScreen
      accessToken={token}
      bookingId={bookingId}
      gateway={gateway}
    />
  );
}
