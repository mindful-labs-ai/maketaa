/**
 * Export utilities for Fabric.js canvas
 */

import type * as fabric from 'fabric';

/**
 * Fabric.js Canvas를 PNG data URL로 변환
 * multiplier: 1로 원본 해상도 유지
 */
export function canvasToDataURL(fabricCanvas: fabric.Canvas): string {
  return fabricCanvas.toDataURL({ format: 'png', multiplier: 1 });
}

/**
 * Data URL을 파일로 다운로드
 */
export function downloadDataURL(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 여러 카드를 순차적으로 렌더링하여 ZIP 파일로 다운로드
 * @param renderCard - 특정 인덱스의 카드를 캔버스에 렌더링하고 data URL 반환하는 함수
 * @param cardCount - 총 카드 수
 * @param topic - 카드뉴스 주제 (파일명용)
 * @param onProgress - 진행률 콜백 (0-100)
 */
export async function exportAllAsZip(
  renderCard: (index: number) => Promise<string>,
  cardCount: number,
  topic: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const safeCount = Math.min(cardCount, 20);

  for (let i = 0; i < safeCount; i++) {
    const dataUrl = await renderCard(i);
    // data URL 형식: "data:image/png;base64,<base64data>"
    const base64 = dataUrl.split(',')[1];
    const filename = `${topic}_card_${i + 1}.png`;
    zip.file(filename, base64, { base64: true });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / safeCount) * 100));
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${topic}_cards.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
