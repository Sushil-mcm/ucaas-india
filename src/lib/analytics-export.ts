import domtoimage from 'dom-to-image';
import jsPDF from 'jspdf';

export const downloadAnalyticsSectionAsPdf = async (
  element: HTMLElement,
  fileName: string,
): Promise<void> => {
  if ('fonts' in document) {
    await document.fonts.ready;
  }

  const width = Math.max(element.scrollWidth, element.clientWidth);
  const height = Math.max(element.scrollHeight, element.clientHeight);
  const dataUrl = await domtoimage.toPng(element, {
    bgcolor: '#f3f4f6',
    width,
    height,
    style: {
      height: `${height}px`,
      maxHeight: 'none',
      overflow: 'visible',
      width: `${width}px`,
    },
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const image = pdf.getImageProperties(dataUrl);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageHeight = (image.height * pageWidth) / image.width;
  const pageCount = Math.max(1, Math.ceil(imageHeight / pageHeight));

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(
      dataUrl,
      'PNG',
      0,
      -pageIndex * pageHeight,
      pageWidth,
      imageHeight,
      undefined,
      'FAST',
    );
  }

  pdf.save(fileName);
};
