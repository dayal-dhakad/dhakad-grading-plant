import type {
  CreateCustomerExportInput,
  CreateGradingExportInput,
  CreateReportExportInput,
} from '@dhakad/shared';
import { ExportStatus, Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import { getOverviewReport } from '../reports/report.service.js';

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
  const doc = new PDFDocument({ size: 'A4', margin: 32, bufferPages: false });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const header = () => {
    doc.fontSize(16).font('Helvetica-Bold').text('Dhakad Grading Plant - Customer Directory');
    doc
      .fontSize(9)
      .font('Helvetica')
      .text(`Status: ${filters.status}${filters.search ? ` | Search: ${filters.search}` : ''}`);
    doc.moveDown(0.5);
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
      if (doc.y > 770) {
        doc.addPage();
        header();
      }
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`${row.name}  |  ${row.mobile}`, { continued: false });
      doc
        .font('Helvetica')
        .fontSize(8)
        .text(
          `${row.village}${row.address ? `, ${row.address}` : ''}  |  Due: INR ${dues.get(row.id) ?? '0.00'}  |  ${row.isActive ? 'Active' : 'Inactive'}`,
        );
      doc.moveDown(0.35);
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
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const header = () => {
    doc.fontSize(15).font('Helvetica-Bold').text('Dhakad Grading Plant - Grading Entries');
    doc
      .fontSize(8)
      .font('Helvetica')
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
        .font('Helvetica-Bold')
        .text(
          `GR-${String(row.entryNumber).padStart(6, '0')} | ${row.serviceDate.toISOString().slice(0, 10)} | ${row.customer.name} (${row.customer.mobile}) | ${row.crop.name} ${row.quantity.toFixed(2)} ${row.unit.symbol}`,
        );
      doc
        .font('Helvetica')
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
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const complete = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
    doc.fontSize(18).font('Helvetica-Bold').text('Dhakad Grading Plant - Business Report');
    doc.fontSize(10).font('Helvetica').text(`${filters.from} to ${filters.to}`);
    doc.moveDown();
    const metric = (label: string, value: string | number) =>
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${label}: `, { continued: true })
        .font('Helvetica')
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
    doc.moveDown().fontSize(13).font('Helvetica-Bold').text('Expenses by category');
    for (const row of report.expenses.categories)
      metric(row.label, `${row.count} entries | INR ${row.amount}`);
    doc.moveDown().fontSize(13).font('Helvetica-Bold').text('Customers with dues');
    for (const row of report.dues.customers) {
      if (doc.y > 770) doc.addPage();
      doc
        .fontSize(8)
        .font('Helvetica')
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
