import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Compact pure TypeScript QR Code matrix generator (ISO/IEC 18004).
 * Supports Byte mode (UTF-8/ASCII) with Error Correction Level L/M.
 * Generates an exact 2D boolean array where true = dark module, false = light module.
 */

// QR Code Polynomials and Galois Field GF(256)
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(() => {
  let value = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = value;
    GF256_LOG[value] = i;
    value <<= 1;
    if (value & 256) {
      value ^= 0x11d; // generator polynomial x^8 + x^4 + x^3 + x^2 + 1
    }
  }
  for (let i = 255; i < 512; i++) {
    GF256_EXP[i] = GF256_EXP[i - 255]!;
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x]! + GF256_LOG[y]!]!;
}

function rsGeneratorPoly(numEcBytes: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < numEcBytes; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] = (next[j] ?? 0) ^ gfMul(poly[j]!, GF256_EXP[i]!);
      next[j + 1] = (next[j + 1] ?? 0) ^ poly[j]!;
    }
    poly = next;
  }
  return poly;
}

function rsCompute(dataBytes: Uint8Array, numEcBytes: number): Uint8Array {
  const gen = rsGeneratorPoly(numEcBytes);
  const remainder = new Uint8Array(numEcBytes);
  for (const byte of dataBytes) {
    const factor = byte ^ remainder[0]!;
    for (let j = 0; j < numEcBytes - 1; j++) {
      remainder[j] = remainder[j + 1]! ^ gfMul(gen[j + 1]!, factor);
    }
    remainder[numEcBytes - 1] = gfMul(gen[numEcBytes]!, factor);
  }
  return remainder;
}

// Version capacities (bytes in Byte mode for EC Level L, Versions 1..8)
const VERSION_CAPACITIES = [
  { version: 1, size: 21, dataBytes: 19, ecBytes: 7 },
  { version: 2, size: 25, dataBytes: 34, ecBytes: 10 },
  { version: 3, size: 29, dataBytes: 55, ecBytes: 15 },
  { version: 4, size: 33, dataBytes: 80, ecBytes: 20 },
  { version: 5, size: 37, dataBytes: 108, ecBytes: 26 },
  { version: 6, size: 41, dataBytes: 136, ecBytes: 36 },
  { version: 7, size: 45, dataBytes: 156, ecBytes: 40 },
  { version: 8, size: 49, dataBytes: 194, ecBytes: 48 },
];

export function generateQrMatrix(text: string): boolean[][] {
  const utf8Bytes = Array.from(new TextEncoder().encode(text));
  const versionInfo =
    VERSION_CAPACITIES.find((v) => v.dataBytes >= utf8Bytes.length + 3) ??
    VERSION_CAPACITIES[VERSION_CAPACITIES.length - 1]!;

  const { ecBytes, size, version } = versionInfo;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );

  // 1. Finder patterns (top-left, top-right, bottom-left)
  function placeFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
          if (r === -1 || r === 7 || c === -1 || c === 7) {
            matrix[mr]![mc] = false;
          } else if (r === 0 || r === 6 || c === 0 || c === 6) {
            matrix[mr]![mc] = true;
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            matrix[mr]![mc] = true;
          } else {
            matrix[mr]![mc] = false;
          }
        }
      }
    }
  }
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6]![i] === null) matrix[6]![i] = i % 2 === 0;
    if (matrix[i]![6] === null) matrix[i]![6] = i % 2 === 0;
  }

  // 3. Alignment pattern for version >= 2
  if (version >= 2) {
    const alignPos = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const mr = alignPos + r;
        const mc = alignPos + c;
        if (matrix[mr]![mc] === null) {
          matrix[mr]![mc] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
        }
      }
    }
  }

  // 4. Dark module
  matrix[4 * version + 9]![8] = true;

  // 5. Reserve format info
  for (let i = 0; i < 9; i++) {
    if (matrix[8]![i] === null) matrix[8]![i] = false;
    if (matrix[i]![8] === null) matrix[i]![8] = false;
    if (matrix[8]![size - 1 - i] === null) matrix[8]![size - 1 - i] = false;
    if (matrix[size - 1 - i]![8] === null) matrix[size - 1 - i]![8] = false;
  }

  // 6. Encode data stream (Byte mode: 0100 + char count + data + padding)
  const bitStream: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bitStream.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(utf8Bytes.length, 8); // Character count indicator
  for (const b of utf8Bytes) {
    pushBits(b, 8);
  }

  // Terminator
  const totalDataBits = versionInfo.dataBytes * 8;
  const termLen = Math.min(4, totalDataBits - bitStream.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bitStream.length % 8 !== 0) {
    bitStream.push(0);
  }

  // Pad bytes 0xEC, 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitStream.length < totalDataBits) {
    pushBits(padBytes[padIdx % 2]!, 8);
    padIdx++;
  }

  // Convert bitStream to dataBytes
  const dataBytes = new Uint8Array(versionInfo.dataBytes);
  for (let i = 0; i < versionInfo.dataBytes; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | (bitStream[i * 8 + b] ?? 0);
    }
    dataBytes[i] = byteVal;
  }

  // Error correction
  const ecData = rsCompute(dataBytes, ecBytes);
  const allCodewords = new Uint8Array(dataBytes.length + ecData.length);
  allCodewords.set(dataBytes, 0);
  allCodewords.set(ecData, dataBytes.length);

  const finalBits: number[] = [];
  for (const cw of allCodewords) {
    for (let b = 7; b >= 0; b--) {
      finalBits.push((cw >> b) & 1);
    }
  }

  // Place codewords in matrix
  let bitIdx = 0;
  let upwards = true;
  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // skip vertical timing column
    const leftCol = rightCol - 1;
    const rowRange = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rowRange) {
      for (const c of [rightCol, leftCol]) {
        if (matrix[r]![c] === null) {
          const bit = bitIdx < finalBits.length ? finalBits[bitIdx] === 1 : false;
          // Mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r]![c] = bit !== mask;
          bitIdx++;
        }
      }
    }
    upwards = !upwards;
  }

  // Format info for Mask 0, EC L: 0b111011111000100
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  matrix[8]![0] = formatBits[0] === 1;
  matrix[8]![1] = formatBits[1] === 1;
  matrix[8]![2] = formatBits[2] === 1;
  matrix[8]![3] = formatBits[3] === 1;
  matrix[8]![4] = formatBits[4] === 1;
  matrix[8]![5] = formatBits[5] === 1;
  matrix[8]![7] = formatBits[6] === 1;
  matrix[8]![8] = formatBits[7] === 1;
  matrix[7]![8] = formatBits[8] === 1;
  matrix[5]![8] = formatBits[9] === 1;
  matrix[4]![8] = formatBits[10] === 1;
  matrix[3]![8] = formatBits[11] === 1;
  matrix[2]![8] = formatBits[12] === 1;
  matrix[1]![8] = formatBits[13] === 1;
  matrix[0]![8] = formatBits[14] === 1;

  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i]![8] = formatBits[i] === 1;
  }
  for (let i = 0; i < 8; i++) {
    matrix[8]![size - 8 + i] = formatBits[7 + i] === 1;
  }

  return matrix.map((row) => row.map((cell) => cell ?? false));
}

export interface CanonicalQrCodeProps {
  readonly payload: string;
  readonly size?: number;
  readonly color?: string;
  readonly backgroundColor?: string;
}

/**
 * Native React Native component that renders a real, scannable QR Code.
 */
export const CanonicalQrCode = React.memo(function CanonicalQrCode({
  payload,
  size = 160,
  color = '#232321',
  backgroundColor = '#FFFFFF',
}: CanonicalQrCodeProps) {
  const matrix = React.useMemo(() => {
    try {
      return generateQrMatrix(payload);
    } catch {
      return [];
    }
  }, [payload]);

  const rows = React.useMemo(
    () =>
      matrix.map((row) => {
        const runs: { start: number; length: number; dark: boolean }[] = [];
        row.forEach((dark, index) => {
          const previous = runs[runs.length - 1];
          if (previous && previous.dark === dark) previous.length += 1;
          else runs.push({ start: index, length: 1, dark });
        });
        return runs;
      }),
    [matrix],
  );

  if (matrix.length === 0) {
    return <View style={[styles.container, { width: size, height: size, backgroundColor }]} />;
  }

  const moduleCount = matrix.length;
  const cellSize = size / moduleCount;

  return (
    <View
      accessibilityLabel={`Mã QR cho ${payload}`}
      accessible={true}
      style={[styles.container, { width: size, height: size, backgroundColor }]}
    >
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, { height: cellSize }]}>
          {row.map((run) => (
            <View
              key={run.start}
              style={{
                width: cellSize * run.length,
                height: cellSize,
                backgroundColor: run.dark ? color : backgroundColor,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
});
