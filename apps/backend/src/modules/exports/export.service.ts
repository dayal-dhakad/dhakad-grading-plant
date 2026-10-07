import type {
  CreateCustomerExportInput,
  CreateGradingExportInput,
  CreateReportExportInput,
} from '@dhakad/shared';
import { ExportStatus, Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import { getOverviewReport } from '../reports/report.service.js';

const regularFontPath = fileURLToPath(
  import.meta
    .resolve('@expo-google-fonts/noto-sans-devanagari/400Regular/NotoSansDevanagari_400Regular.ttf'),
);
const boldFontPath = fileURLToPath(
  import.meta
    .resolve('@expo-google-fonts/noto-sans-devanagari/700Bold/NotoSansDevanagari_700Bold.ttf'),
);
const regularFont = 'ExportRegular';
const boldFont = 'ExportBold';

const createPdf = (options: PDFKit.PDFDocumentOptions) => {
  const doc = new PDFDocument(options);
  doc.registerFont(regularFont, regularFontPath);
  doc.registerFont(boldFont, boldFontPath);
  return doc;
};

const present = (job: {
  id: string;
  type: string;
  format: string;
  status: ExportStatus;
  filters: Prisma.JsonValue;
  fileName: string | null;
  recordCount: number | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}) => ({
  id: job.id,
  type: job.type as 'CUSTOMERS' | 'GRADING_ENTRIES' | 'REPORT',
  format: 'PDF' as const,
  status: job.status,
  filters: job.filters as
    CreateCustomerExportInput | CreateGradingExportInput | CreateReportExportInput,
  fileName: job.fileName,
  recordCount: job.recordCount,
  error: job.error,
  createdAt: job.createdAt.toISOString(),
  completedAt: job.completedAt?.toISOString() ?? null,
});
const whereFor = (filters: CreateCustomerExportInput): Prisma.CustomerWhereInput => ({
  ...(filters.status === 'all' ? {} : { isActive: filters.status === 'active' }),
  ...(filters.search
    ? {
        OR: [
          { mobile: { contains: filters.search } },
          { name: { contains: filters.search, mode: 'insensitive' } },
          { village: { contains: filters.search, mode: 'insensitive' } },
        ],
      }
    : {}),
});
const buildCustomerPdf = async (filters: CreateCustomerExportInput) => {
  const doc = createPdf({ size: 'A4', layout: 'landscape', margin: 24, bufferPages: false });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columns = [
    { label: '#', key: 'number', width: 24, align: 'right' as const },
    { label: 'Name', key: 'name', width: 105 },
    { label: 'Mobile', key: 'mobile', width: 66 },
    { label: 'Village', key: 'village', width: 86 },
    { label: 'Address', key: 'address', width: 168 },
    { label: 'Due', key: 'due', width: 64, align: 'right' as const },
    { label: 'Status', key: 'status', width: 51 },
    { label: 'WhatsApp', key: 'whatsapp', width: 55 },
    { label: 'SMS', key: 'sms', width: 42 },
    { label: 'Created', key: 'created', width: 65 },
    { label: 'Updated', key: 'updated', width: 65 },
  ];
  const configuredWidth = columns.reduce((total, column) => total + column.width, 0);
  columns[4]!.width += pageWidth - configuredWidth;
  const tableTop = 72;
  const headerHeight = 25;
  const cellPadding = 4;
  const date = (value: Date) =>
    value.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  const drawTableHeader = () => {
    let x = doc.page.margins.left;
    doc.rect(x, tableTop, pageWidth, headerHeight).fill('#E7E5E4');
    for (const column of columns) {
      doc
        .rect(x, tableTop, column.width, headerHeight)
        .stroke('#A8A29E')
        .font(boldFont)
        .fontSize(7.5)
        .fillColor('#1C1917')
        .text(column.label, x + cellPadding, tableTop + 7, {
          width: column.width - cellPadding * 2,
          align: column.align ?? 'left',
          lineBreak: false,
        });
      x += column.width;
    }
    doc.y = tableTop + headerHeight;
  };
  const header = () => {
    doc
      .fontSize(16)
      .font(boldFont)
      .fillColor('#1C1917')
      .text('Dhakad Grading Plant - Customer Directory');
    doc
      .fontSize(9)
      .font(regularFont)
      .text(`Status: ${filters.status}${filters.search ? ` | Search: ${filters.search}` : ''}`);
    drawTableHeader();
  };
  header();
  let cursor: string | undefined;
  let count = 0;
  for (;;) {
    const rows = await prisma.customer.findMany({
      where: whereFor(filters),
      orderBy: { id: 'asc' },
      take: 500,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!rows.length) break;
    const balances = await prisma.customerLedgerEntry.groupBy({
      by: ['customerId'],
      where: { customerId: { in: rows.map((x) => x.id) } },
      _sum: { amount: true },
    });
    const dues = new Map(
      balances.map((x) => [x.customerId, (x._sum.amount ?? new Prisma.Decimal(0)).toFixed(2)]),
    );
    for (const row of rows) {
      const values: Record<string, string> = {
        number: String(count + 1),
        name: row.name,
        mobile: row.mobile,
        village: row.village,
        address: row.address || '—',
        due: `₹ ${dues.get(row.id) ?? '0.00'}`,
        status: row.isActive ? 'Active' : 'Inactive',
        whatsapp: row.whatsappConsent ? 'Yes' : 'No',
        sms: row.smsConsent ? 'Yes' : 'No',
        created: date(row.createdAt),
        updated: date(row.updatedAt),
      };
      doc.font(regularFont).fontSize(7.5);
      const rowHeight = Math.max(
        25,
        ...columns.map(
          (column) =>
            doc.heightOfString(values[column.key]!, {
              width: column.width - cellPadding * 2,
              align: column.align ?? 'left',
            }) +
            cellPadding * 2,
        ),
      );
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        header();
      }
      const y = doc.y;
      let x = doc.page.margins.left;
      for (const column of columns) {
        doc
          .rect(x, y, column.width, rowHeight)
          .stroke('#D6D3D1')
          .font(regularFont)
          .fontSize(7.5)
          .fillColor('#1C1917')
          .text(values[column.key]!, x + cellPadding, y + cellPadding, {
            width: column.width - cellPadding * 2,
            height: rowHeight - cellPadding * 2,
            align: column.align ?? 'left',
          });
        x += column.width;
      }
      doc.y = y + rowHeight;
      count += 1;
    }
    cursor = rows.at(-1)!.id;
  }
  doc.end();
  return { data: await complete, count };
};
const processJob = async (id: string, filters: CreateCustomerExportInput) => {
  try {
    await prisma.exportJob.update({ where: { id }, data: { status: ExportStatus.PROCESSING } });
    const result = await buildCustomerPdf(filters);
    await prisma.exportJob.update({
      where: { id },
      data: {
        status: ExportStatus.READY,
        fileName: `customers-${new Date().toISOString().slice(0, 10)}.pdf`,
        fileData: result.data,
        recordCount: result.count,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.exportJob.update({
      where: { id },
      data: {
        status: ExportStatus.FAILED,
        error: error instanceof Error ? error.message.slice(0, 500) : 'Export failed',
        completedAt: new Date(),
      },
    });
  }
};
const buildGradingPdf = async (filters: CreateGradingExportInput) => {
  const doc = createPdf({ size: 'A4', layout: 'landscape', margin: 28 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const header = () => {
    doc.fontSize(15).font(boldFont).text('Dhakad Grading Plant - Grading Entries');
    doc
      .fontSize(8)
      .font(regularFont)
      .text(
        `${filters.from ?? 'All dates'} to ${filters.to ?? 'All dates'} | Status: ${filters.status}${filters.search ? ` | Search: ${filters.search}` : ''}`,
      );
    doc.moveDown(0.5);
  };
  const where: Prisma.GradingEntryWhereInput = {
    ...(filters.status === 'all'
      ? {}
      : { status: filters.status === 'active' ? 'ACTIVE' : 'CANCELLED' }),
    ...(filters.from || filters.to
      ? {
          serviceDate: {
            ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
            ...(filters.to ? { lte: new Date(`${filters.to}T00:00:00.000Z`) } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
            { customer: { mobile: { contains: filters.search } } },
            { crop: { name: { contains: filters.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  header();
  let cursor: string | undefined;
  let count = 0;
  for (;;) {
    const rows = await prisma.gradingEntry.findMany({
      where,
      orderBy: { id: 'asc' },
      take: 500,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        customer: { select: { name: true, mobile: true } },
        crop: { select: { name: true } },
        unit: { select: { symbol: true } },
        createdBy: { select: { name: true } },
      },
    });
    if (!rows.length) break;
    for (const row of rows) {
      if (doc.y > 535) {
        doc.addPage();
        header();
      }
      const due = Prisma.Decimal.max(
        new Prisma.Decimal(0),
        row.calculatedAmount.minus(row.paidAmount).minus(row.waivedAmount),
      );
      doc
        .fontSize(8)
        .font(boldFont)
        .text(
          `GR-${String(row.entryNumber).padStart(6, '0')} | ${row.serviceDate.toISOString().slice(0, 10)} | ${row.customer.name} (${row.customer.mobile}) | ${row.crop.name} ${row.quantity.toFixed(2)} ${row.unit.symbol}`,
        );
      doc
        .font(regularFont)
        .fontSize(7.5)
        .text(
          `Staff: ${row.createdBy.name} | Amount: INR ${row.calculatedAmount.toFixed(2)} | Paid: ${row.paidAmount.toFixed(2)} | Waived: ${row.waivedAmount.toFixed(2)} | Due: ${due.toFixed(2)} | ${row.paymentMethod} | ${row.status}`,
        );
      doc.moveDown(0.3);
      count += 1;
    }
    cursor = rows.at(-1)!.id;
  }
  doc.end();
  return { data: await complete, count };
};
const processGradingJob = async (id: string, filters: CreateGradingExportInput) => {
  try {
    await prisma.exportJob.update({ where: { id }, data: { status: ExportStatus.PROCESSING } });
    const result = await buildGradingPdf(filters);
    await prisma.exportJob.update({
      where: { id },
      data: {
        status: ExportStatus.READY,
        fileName: `grading-entries-${new Date().toISOString().slice(0, 10)}.pdf`,
        fileData: result.data,
        recordCount: result.count,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.exportJob.update({
      where: { id },
      data: {
        status: ExportStatus.FAILED,
        error: error instanceof Error ? error.message.slice(0, 500) : 'Export failed',
        completedAt: new Date(),
      },
    });
  }
};
export const createCustomerExport = async (filters: CreateCustomerExportInput, userId: string) => {
  const job = await prisma.exportJob.create({
    data: { type: 'CUSTOMERS', format: 'PDF', filters, createdById: userId },
  });
  setImmediate(() => void processJob(job.id, filters));
  return present(job);
};
export const createGradingExport = async (filters: CreateGradingExportInput, userId: string) => {
  const job = await prisma.exportJob.create({
    data: { type: 'GRADING_ENTRIES', format: 'PDF', filters, createdById: userId },
  });
  setImmediate(() => void processGradingJob(job.id, filters));
  return present(job);
};
const processReportJob = async (id: string, filters: CreateReportExportInput) => {
  try {
    await prisma.exportJob.update({ where: { id }, data: { status: ExportStatus.PROCESSING } });
    const report = await getOverviewReport(filters);
    const doc = createPdf({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const complete = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
    doc.fontSize(18).font(boldFont).text('Dhakad Grading Plant - Business Report');
    doc.fontSize(10).font(regularFont).text(`${filters.from} to ${filters.to}`);
    doc.moveDown();
    const metric = (label: string, value: string | number) =>
      doc
        .fontSize(10)
        .font(boldFont)
        .text(`${label}: `, { continued: true })
        .font(regularFont)
        .text(String(value));
    metric('Grading entries', report.grading.count);
    metric('Grading quantity', `${report.grading.quantityQuintals} quintals`);
    metric('Grading charges', `INR ${report.grading.amount}`);
    metric('Grading paid', `INR ${report.grading.paid}`);
    metric('Grading due', `INR ${report.grading.due}`);
    metric('Grading waived', `INR ${report.grading.waived}`);
    metric(
      'Worker payments',
      `INR ${report.workerPayments.amount} (${report.workerPayments.count} payments)`,
    );
    metric('Grading expenses', `INR ${report.expenses.grading.amount}`);
    metric('Admin personal expenses', `INR ${report.expenses.adminPersonal.amount}`);
    metric('Estimated grading margin', `INR ${report.expenses.gradingMargin}`);
    metric('Current customer dues', `INR ${report.dues.total}`);
    doc.moveDown().fontSize(13).font(boldFont).text('Expenses by category');
    for (const row of report.expenses.categories)
      metric(row.label, `${row.count} entries | INR ${row.amount}`);
    doc.moveDown().fontSize(13).font(boldFont).text('Customers with dues');
    for (const row of report.dues.customers) {
      if (doc.y > 770) doc.addPage();
      doc
        .fontSize(8)
        .font(regularFont)
        .text(`${row.name} | ${row.mobile} | ${row.village} | INR ${row.amount}`);
    }
    doc.end();
    const data = await complete;
    await prisma.exportJob.update({
      where: { id },
      data: {
        status: ExportStatus.READY,
        fileName: `business-report-${filters.from}-${filters.to}.pdf`,
        fileData: data,
        recordCount: report.dues.customers.length,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.exportJob.update({
      where: { id },
      data: {
        status: ExportStatus.FAILED,
        error: error instanceof Error ? error.message.slice(0, 500) : 'Export failed',
        completedAt: new Date(),
      },
    });
  }
};
export const createReportExport = async (filters: CreateReportExportInput, userId: string) => {
  const job = await prisma.exportJob.create({
    data: { type: 'REPORT', format: 'PDF', filters, createdById: userId },
  });
  setImmediate(() => void processReportJob(job.id, filters));
  return present(job);
};
export const listExports = async (userId: string) => ({
  exportJobs: (
    await prisma.exportJob.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  ).map(present),
});
export const getExportDownload = async (id: string, userId: string) => {
  const job = await prisma.exportJob.findFirst({ where: { id, createdById: userId } });
  if (!job) throw new AppError(404, 'EXPORT_NOT_FOUND', 'Export was not found');
  if (job.status !== ExportStatus.READY || !job.fileData || !job.fileName)
    throw new AppError(409, 'EXPORT_NOT_READY', 'Export is not ready');
  return { data: Buffer.from(job.fileData), fileName: job.fileName };
};
