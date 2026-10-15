import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function saveOrShareDownloadedFile(blob: Blob, name: string, mimeType: string) {
  if (!blob.size) throw new Error('Tệp phản hồi rỗng. Vui lòng thử lại.');
  const filename = name.replace(/[^\p{L}\p{N}._-]/gu, '-');
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Allow the browser to consume the URL before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) {
    throw new Error('Thiết bị chưa hỗ trợ lưu/chia sẻ tệp.');
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp từ máy chủ.'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') return reject(new Error('Tệp không hợp lệ.'));
      resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  try {
    await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(uri, {
      mimeType,
      UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.data',
    });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
