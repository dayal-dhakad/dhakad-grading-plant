import {
  CreateCustomerExportSchema,
  CreateGradingExportSchema,
  CreateReportExportSchema,
  ExportJobListResponseSchema,
  ExportJobResponseSchema,
  type CreateCustomerExportInput,
  type CreateGradingExportInput,
  type CreateReportExportInput,
  type ExportJob,
} from '@dhakad/shared';
import { baseApi } from './base-api';
export const exportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExports: builder.query<ExportJob[], void>({
      query: () => '/exports',
      transformResponse: (v: unknown) => ExportJobListResponseSchema.parse(v).exportJobs,
      providesTags: [{ type: 'Export', id: 'LIST' }],
    }),
    createCustomerExport: builder.mutation<ExportJob, CreateCustomerExportInput>({
      query: (body) => ({
        url: '/exports/customers',
        method: 'POST',
        body: CreateCustomerExportSchema.parse(body),
      }),
      transformResponse: (v: unknown) => ExportJobResponseSchema.parse(v).exportJob,
      invalidatesTags: [{ type: 'Export', id: 'LIST' }],
    }),
    createGradingExport: builder.mutation<ExportJob, CreateGradingExportInput>({
      query: (body) => ({
        url: '/exports/grading-entries',
        method: 'POST',
        body: CreateGradingExportSchema.parse(body),
      }),
      transformResponse: (value: unknown) => ExportJobResponseSchema.parse(value).exportJob,
      invalidatesTags: [{ type: 'Export', id: 'LIST' }],
    }),
    createReportExport: builder.mutation<ExportJob, CreateReportExportInput>({
      query: (body) => ({
        url: '/exports/reports',
        method: 'POST',
        body: CreateReportExportSchema.parse(body),
      }),
      transformResponse: (value: unknown) => ExportJobResponseSchema.parse(value).exportJob,
      invalidatesTags: [{ type: 'Export', id: 'LIST' }],
    }),
  }),
});
export const {
  useGetExportsQuery,
  useCreateCustomerExportMutation,
  useCreateGradingExportMutation,
  useCreateReportExportMutation,
} = exportApi;
