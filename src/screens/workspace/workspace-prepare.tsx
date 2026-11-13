import { useState } from 'react';
import { View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { closed } from '@/features/couple-workspace/policies';
import { WorkspaceGroups } from './workspace-groups';
import { WorkspaceSeating } from './workspace-seating';
import { WorkspaceInvitations } from './workspace-invitations';
import { WorkspaceAppendices } from './workspace-appendices';
import { Notice, Page, s, type WorkspaceProps } from './workspace-common';
import { PrepareSectionPicker } from './prepare-section-picker';

const sections = [
  ['groups', 'Quy mô & nhóm'],
  ['seating', 'Sơ đồ bàn'],
  ['invitation', 'Thiệp cưới'],
  ['appendix', 'Phụ lục hợp đồng'],
] as const;
type PrepareSection = (typeof sections)[number][0];
export type PrepareSectionPickerProps = {
  value: PrepareSection;
  onChange: (section: PrepareSection) => void;
  options: typeof sections;
};
export function WorkspacePrepare(
  props: WorkspaceProps & {
    section?: PrepareSection | undefined;
    onSectionChange?: (section: PrepareSection) => void;
  },
) {
  const [localSection, setSection] = useState<PrepareSection>(props.section ?? 'groups');
  const section = props.section ?? localSection;
  const [visited, setVisited] = useState<ReadonlySet<PrepareSection>>(
    () => new Set([props.section ?? 'groups']),
  );
  if (!visited.has(section)) setVisited(new Set([...visited, section]));
  if (props.booking.accessLevel !== 'FULL')
    return (
      <Page title="Chuẩn bị">
        <Notice>Hai bạn có thể bắt đầu chuẩn bị sau khi khoản đặt cọc được xác nhận.</Notice>
      </Page>
    );
  const choose = (next: PrepareSection) => {
    setSection(next);
    props.onSectionChange?.(next);
    setVisited((old) => new Set([...old, next]));
  };
  return (
    <Page title="Chuẩn bị">
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Mục chuẩn bị</Text>
        <PrepareSectionPicker value={section} onChange={choose} options={sections} />
      </View>
      {closed(props.booking.phase) && (
        <Notice>Tiệc đã hoàn tất hoặc huỷ. Hai bạn có thể xem lại thông tin đã lưu.</Notice>
      )}
      {(visited.has('groups') || section === 'groups') && (
        <View style={section !== 'groups' ? { display: 'none' } : undefined}>
          <WorkspaceGroups {...props} />
        </View>
      )}
      {(visited.has('seating') || section === 'seating') && (
        <View style={section !== 'seating' ? { display: 'none' } : undefined}>
          <WorkspaceSeating {...props} />
        </View>
      )}
      {(visited.has('invitation') || section === 'invitation') && (
        <View style={section !== 'invitation' ? { display: 'none' } : undefined}>
          <WorkspaceInvitations {...props} />
        </View>
      )}
      {(visited.has('appendix') || section === 'appendix') && (
        <View style={section !== 'appendix' ? { display: 'none' } : undefined}>
          <WorkspaceAppendices {...props} />
        </View>
      )}
    </Page>
  );
}
