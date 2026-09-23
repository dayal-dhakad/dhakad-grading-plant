import {
  ReportQuerySchema,
  ReportResponseSchema,
  type ReportQuery,
  type ReportResponse,
} from '@dhakad/shared';
import { baseApi } from './base-api';
export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOverviewReport: builder.query<ReportResponse, ReportQuery>({
      query: (params) => ({ url: '/reports/overview', params: ReportQuerySchema.parse(params) }),
      transformResponse: (value: unknown) => ReportResponseSchema.parse(value),
      providesTags: [{ type: 'Report', id: 'OVERVIEW' }],
    }),
  }),
});
export const { useGetOverviewReportQuery } = reportApi;
