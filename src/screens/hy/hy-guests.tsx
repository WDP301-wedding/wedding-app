import React, { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { HyButton, HySheet, HyState, HyText as Text } from '@/components/hy-ui';
import { hy } from '@/theme';
import { RestoredGuestPanel } from '../v0/restored-flow-controls';
import type { V0CommonProps } from '../v0/v0-types';
import { HyArchivedGuestsSheet } from './hy-archived-guests-sheet';
import { HyConfirmArchiveSheet } from './hy-confirm-archive-sheet';
import { HyGuestDetailSheet } from './hy-guest-detail-sheet';
import { HyGuestCreateSheet, HyGuestEditSheet, HyHeadcountEditSheet } from './hy-guest-form-sheets';
import { HyGuestListHeader } from './hy-guest-list-header';
import { GuestRow } from './hy-guest-row';
import type { Guest } from './hy-guest-types';
import { useHyGuestActions } from './use-hy-guest-actions';
import { useHyGuestsData } from './use-hy-guests-data';

export function HyGuests({ activeBooking, facts, session, onNavigate }: V0CommonProps) {
  const {
    bookingId,
    data,
    loading,
    error,
    reload,
    auxData,
    auxLoading,
    reloadAux,
    handleRefresh,
    loadingAdditional,
    guests,
    groups,
    groupMap,
    currentHeadcount,
    search,
    setSearch,
    group,
    setGroup,
    filtered,
  } = useHyGuestsData({ session, activeBooking, facts });

  const {
    selected,
    setSelected,
    settingsOpen,
    setSettingsOpen,
    editHeadcountOpen,
    setEditHeadcountOpen,
    headcountValue,
    setHeadcountValue,
    headcountSaving,
    headcountError,
    setHeadcountError,
    handleOpenHeadcount,
    handleSaveHeadcount,
    createGuestOpen,
    setCreateGuestOpen,
    createName,
    setCreateName,
    createGroupId,
    setCreateGroupId,
    createPhone,
    setCreatePhone,
    createNote,
    setCreateNote,
    createSaving,
    createError,
    setCreateError,
    handleOpenCreate,
    handleCreateGuest,
    editGuestOpen,
    setEditGuestOpen,
    editingGuest,
    editName,
    setEditName,
    editGroupId,
    setEditGroupId,
    editPhone,
    setEditPhone,
    editNote,
    setEditNote,
    editSaving,
    editError,
    setEditError,
    handleOpenEdit,
    handleSaveEditGuest,
    confirmArchiveGuest,
    setConfirmArchiveGuest,
    archiveSaving,
    handleRequestArchive,
    handleConfirmArchive,
    archivedOpen,
    setArchivedOpen,
    issuingLink,
    issuedLink,
    setIssuedLink,
    issueError,
    setIssueError,
    handleIssueInvitationLink,
  } = useHyGuestActions({
    session,
    bookingId,
    auxData,
    currentHeadcount,
    groups,
    reload,
    reloadAux,
  });

  const renderItem = useCallback(
    ({ item, index }: { item: Guest; index: number }) => (
      <GuestRow
        guest={item}
        group={groupMap.get(item.guestGroupId)}
        onPress={setSelected}
        isFirst={index === 0}
        isLast={index === filtered.length - 1}
      />
    ),
    [filtered.length, groupMap, setSelected],
  );

  const keyExtractor = useCallback((item: Guest) => item.guestId, []);

  const listEmpty = useMemo(() => {
    if (loading && !data) return <HyState kind="loading" />;
    if (error) return <HyState kind="error" body={error} onRetry={() => void reload()} />;
    if (search && loadingAdditional) {
      return (
        <HyState
          kind="loading"
          title="Đang tìm kiếm…"
          body="Đang nạp thêm danh sách khách mời để đối chiếu kết quả tìm kiếm…"
        />
      );
    }
    return (
      <View style={{ gap: 12, alignItems: 'center', paddingVertical: 12 }}>
        <HyState
          kind="empty"
          title={
            search
              ? 'Không tìm thấy khách phù hợp'
              : group
                ? `Nhóm "${groupMap.get(group)?.name ?? 'này'}" chưa có tên khách`
                : 'Chưa có tên khách'
          }
          body={
            group
              ? 'Bạn có thể bấm "+ Thêm khách" bên dưới để thêm khách vào nhóm này.'
              : 'Danh sách tên là tùy chọn. Sơ đồ bàn tiệc vẫn hoạt động theo nhóm mà không cần nhập tên.'
          }
        />
        {!search && (
          <HyButton label="+ Thêm khách mời" variant="outline" onPress={handleOpenCreate} />
        )}
      </View>
    );
  }, [loading, data, error, search, loadingAdditional, group, groupMap, handleOpenCreate, reload]);

  return (
    <>
      <View style={{ flex: 1, backgroundColor: hy.canvas }}>
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={
            <HyGuestListHeader
              filteredCount={filtered.length}
              currentHeadcount={currentHeadcount}
              totalGuestsCount={guests.length}
              hasData={data !== null}
              auxData={auxData}
              auxLoading={auxLoading}
              search={search}
              onSearchChange={setSearch}
              group={group}
              onSelectGroup={setGroup}
              groups={groups}
              onOpenCreate={handleOpenCreate}
              onOpenEditHeadcount={handleOpenHeadcount}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenArchived={() => setArchivedOpen(true)}
            />
          }
          ListEmptyComponent={listEmpty}
          ListFooterComponent={
            loadingAdditional ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: hy.muted }}>Đang tải thêm khách mời…</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void handleRefresh()}
              tintColor={hy.primary}
              colors={[hy.primary]}
            />
          }
        />
      </View>

      {/* Guest Detail Bottom Sheet */}
      <HyGuestDetailSheet
        selected={selected}
        group={selected ? groupMap.get(selected.guestGroupId) : undefined}
        issuedLink={issuedLink}
        issueError={issueError}
        issuingLink={issuingLink}
        attendanceCheckInText={
          !auxData?.attendance || auxData.attendance.checkInMode === 'NONE'
            ? 'Chưa ghi nhận'
            : 'Theo cài đặt điểm danh'
        }
        onClose={() => {
          setSelected(null);
          setIssueError(null);
          setIssuedLink(null);
        }}
        onOpenEdit={handleOpenEdit}
        onIssueLink={handleIssueInvitationLink}
        onNavigateShare={() => {
          setSelected(null);
          onNavigate('share');
        }}
      />

      {/* Create Guest Bottom Sheet */}
      <HyGuestCreateSheet
        visible={createGuestOpen}
        groups={groups}
        name={createName}
        groupId={createGroupId}
        phone={createPhone}
        note={createNote}
        error={createError}
        saving={createSaving}
        onClose={() => setCreateGuestOpen(false)}
        onChangeName={(txt) => {
          setCreateName(txt);
          setCreateError(null);
        }}
        onChangeGroupId={setCreateGroupId}
        onChangePhone={(txt) => {
          setCreatePhone(txt);
          setCreateError(null);
        }}
        onChangeNote={(txt) => {
          setCreateNote(txt);
          setCreateError(null);
        }}
        onSubmit={() => void handleCreateGuest()}
      />

      {/* Edit Guest Bottom Sheet */}
      <HyGuestEditSheet
        visible={editGuestOpen}
        groups={groups}
        editingGuest={editingGuest}
        name={editName}
        groupId={editGroupId}
        phone={editPhone}
        note={editNote}
        error={editError}
        saving={editSaving}
        onClose={() => setEditGuestOpen(false)}
        onChangeName={(txt) => {
          setEditName(txt);
          setEditError(null);
        }}
        onChangeGroupId={setEditGroupId}
        onChangePhone={(txt) => {
          setEditPhone(txt);
          setEditError(null);
        }}
        onChangeNote={(txt) => {
          setEditNote(txt);
          setEditError(null);
        }}
        onSubmit={() => void handleSaveEditGuest()}
        onArchive={handleRequestArchive}
      />

      {/* Quick Edit Headcount Bottom Sheet */}
      <HyHeadcountEditSheet
        visible={editHeadcountOpen}
        value={headcountValue}
        error={headcountError}
        saving={headcountSaving}
        onClose={() => setEditHeadcountOpen(false)}
        onChangeValue={(txt) => {
          setHeadcountValue(txt);
          setHeadcountError(null);
        }}
        onSubmit={() => void handleSaveHeadcount()}
      />

      {/* Check-in Settings Sheet */}
      <HySheet
        visible={settingsOpen}
        title="Cài đặt điểm danh sự kiện"
        onClose={() => {
          setSettingsOpen(false);
          void reloadAux();
        }}
      >
        <RestoredGuestPanel activeBooking={activeBooking} session={session} />
      </HySheet>

      {/* Confirm Archive Popup Sheet */}
      <HyConfirmArchiveSheet
        visible={confirmArchiveGuest !== null}
        target={confirmArchiveGuest}
        saving={archiveSaving}
        onClose={() => setConfirmArchiveGuest(null)}
        onConfirm={(target) => void handleConfirmArchive(target)}
      />

      {/* Archived Guests Sheet */}
      <HyArchivedGuestsSheet
        visible={archivedOpen}
        bookingId={bookingId}
        session={session}
        groups={groups}
        onClose={() => setArchivedOpen(false)}
        onGuestRestored={() => void reload()}
      />
    </>
  );
}
