import { PDFDocument } from "pdf-lib";

/** Standard ISO A4 Dimensions in Points (72 DPI) */
export const A4_PORTRAIT = { width: 595.28, height: 841.89 } as const;
export const A4_LANDSCAPE = { width: 841.89, height: 595.28 } as const;
export const A5_PORTRAIT = { width: 420.94, height: 595.28 } as const;

/**
 * Imposes A5 portrait PDF pages into a standard 2x1 landscape folded A4 booklet.
 * Preserves vector graphics, fonts, margins, and content layout.
 *
 * @param srcPdfBytes Raw bytes of compiled A5 PDF
 * @returns Raw bytes of imposed A4 landscape folded booklet PDF
 */
export async function imposeA5ToA4Booklet(srcPdfBytes: Uint8Array): Promise<{
  bookletPdfBytes: Uint8Array;
  sheetCount: number;
  originalPageCount: number;
}> {
  const srcDoc = await PDFDocument.load(srcPdfBytes);
  const totalSrcPages = srcDoc.getPageCount();

  if (totalSrcPages === 0) {
    throw new Error("Cannot impose empty PDF document.");
  }

  // Calculate signature padding (must be multiple of 4)
  const targetPageCount = Math.ceil(totalSrcPages / 4) * 4;
  const numSheets = targetPageCount / 4;

  const outDoc = await PDFDocument.create();

  // Embed all source pages into target document
  const embeddedPages: (any | null)[] = [];
  for (let i = 0; i < totalSrcPages; i++) {
    const [embedded] = await outDoc.embedPdf(srcDoc, [i]);
    embeddedPages.push(embedded);
  }

  // Pad remaining signature pages with blanks (null)
  while (embeddedPages.length < targetPageCount) {
    embeddedPages.push(null);
  }

  const HALF_WIDTH = A4_LANDSCAPE.width / 2; // 420.945 pt

  for (let s = 0; s < numSheets; s++) {
    // 4-page signature mapping:
    // Sheet Front: [p_last, p_first]
    // Sheet Back:  [p_second, p_third]
    const pLastIdx = targetPageCount - 1 - 2 * s;
    const pFirstIdx = 2 * s;
    const pSecondIdx = 2 * s + 1;
    const pThirdIdx = targetPageCount - 2 - 2 * s;

    // 1. Front Page (Landscape Sheet Front)
    const frontPage = outDoc.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
    if (embeddedPages[pLastIdx]) {
      frontPage.drawPage(embeddedPages[pLastIdx], {
        x: 0,
        y: 0,
        width: HALF_WIDTH,
        height: A4_LANDSCAPE.height,
      });
    }
    if (embeddedPages[pFirstIdx]) {
      frontPage.drawPage(embeddedPages[pFirstIdx], {
        x: HALF_WIDTH,
        y: 0,
        width: HALF_WIDTH,
        height: A4_LANDSCAPE.height,
      });
    }

    // 2. Back Page (Landscape Sheet Back)
    const backPage = outDoc.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
    if (embeddedPages[pSecondIdx]) {
      backPage.drawPage(embeddedPages[pSecondIdx], {
        x: 0,
        y: 0,
        width: HALF_WIDTH,
        height: A4_LANDSCAPE.height,
      });
    }
    if (embeddedPages[pThirdIdx]) {
      backPage.drawPage(embeddedPages[pThirdIdx], {
        x: HALF_WIDTH,
        y: 0,
        width: HALF_WIDTH,
        height: A4_LANDSCAPE.height,
      });
    }
  }

  const bookletPdfBytes = await outDoc.save();
  return {
    bookletPdfBytes,
    sheetCount: numSheets * 2, // Total printable A4 sides
    originalPageCount: totalSrcPages,
  };
}

/**
 * Merges multiple exam PDF parts into one unified master PDF.
 * Order: [CQ+SQ Folded Booklet, MCQ Questions, MCQ Solutions]
 */
export async function mergeExamDocuments(
  bookletBytes?: Uint8Array,
  mcqBytes?: Uint8Array,
  solBytes?: Uint8Array
): Promise<Uint8Array> {
  const masterDoc = await PDFDocument.create();

  if (bookletBytes && bookletBytes.length > 0) {
    const doc = await PDFDocument.load(bookletBytes);
    const indices = doc.getPageIndices();
    const copiedPages = await masterDoc.copyPages(doc, indices);
    copiedPages.forEach((p) => masterDoc.addPage(p));
  }

  if (mcqBytes && mcqBytes.length > 0) {
    const doc = await PDFDocument.load(mcqBytes);
    const indices = doc.getPageIndices();
    const copiedPages = await masterDoc.copyPages(doc, indices);
    copiedPages.forEach((p) => masterDoc.addPage(p));
  }

  if (solBytes && solBytes.length > 0) {
    const doc = await PDFDocument.load(solBytes);
    const indices = doc.getPageIndices();
    const copiedPages = await masterDoc.copyPages(doc, indices);
    copiedPages.forEach((p) => masterDoc.addPage(p));
  }

  return await masterDoc.save();
}
