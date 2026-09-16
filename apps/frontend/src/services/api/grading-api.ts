import {
  CreateGradingEntrySchema,
  GradingEntryResponseSchema,
  GradingListResponseSchema,
  GradingReferenceResponseSchema,
  GradingRevisionListResponseSchema,
  ReviseGradingEntrySchema,
  type CreateGradingEntryInput,
  type GradingEntry,
  type GradingListResponse,
  type ReviseGradingEntryInput,
} from '@dhakad/shared';
import { baseApi } from './base-api';

export const gradingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGradingReferences: builder.query<
      ReturnType<typeof GradingReferenceResponseSchema.parse>,
      void
    >({
      query: () => '/grading/references',
      transformResponse: (value: unknown) => GradingReferenceResponseSchema.parse(value),
      providesTags: [{ type: 'GradingReference', id: 'LIST' }],
    }),
    getGradingEntries: builder.query<
      GradingListResponse,
      {
        search?: string;
        from?: string;
        to?: string;
        status: 'active' | 'cancelled' | 'all';
        customerId?: string;
        staffId?: string;
        page: number;
        pageSize?: number;
      }
    >({
      query: (params) => ({ url: '/grading', params }),
      transformResponse: (value: unknown) => GradingListResponseSchema.parse(value),
      providesTags: (result) =>
        result
          ? [
              { type: 'Grading', id: 'LIST' },
              ...result.gradingEntries.map(({ id }) => ({ type: 'Grading' as const, id })),
            ]
          : [{ type: 'Grading', id: 'LIST' }],
    }),
    getGradingEntry: builder.query<GradingEntry, string>({
      query: (id) => `/grading/${id}`,
      transformResponse: (value: unknown) => GradingEntryResponseSchema.parse(value).gradingEntry,
      providesTags: (_r, _e, id) => [{ type: 'Grading', id }],
    }),
    createGradingEntry: builder.mutation<GradingEntry, CreateGradingEntryInput>({
      query: (body) => ({
        url: '/grading',
        method: 'POST',
        body: CreateGradingEntrySchema.parse(body),
      }),
      transformResponse: (value: unknown) => GradingEntryResponseSchema.parse(value).gradingEntry,
      invalidatesTags: (_result, _error, input) => [
        { type: 'Grading', id: 'LIST' },
        { type: 'Grading', id: `DUE-${input.customerId}` },
      ],
    }),
    cancelGradingEntry: builder.mutation<GradingEntry, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/grading/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (value: unknown) => GradingEntryResponseSchema.parse(value).gradingEntry,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Grading', id },
        { type: 'Grading', id: 'LIST' },
      ],
    }),
    reviseGradingEntry: builder.mutation<
      GradingEntry,
      { id: string; input: ReviseGradingEntryInput }
    >({
      query: ({ id, input }) => ({
        url: `/grading/${id}`,
        method: 'PUT',
        body: ReviseGradingEntrySchema.parse(input),
      }),
      transformResponse: (value: unknown) => GradingEntryResponseSchema.parse(value).gradingEntry,
      invalidatesTags: (_r, _e, { id, input }) => [
        { type: 'Grading', id },
        { type: 'Grading', id: 'LIST' },
        { type: 'Grading', id: `DUE-${input.customerId}` },
        { type: 'Grading', id: `REVISIONS-${id}` },
      ],
    }),
    getGradingRevisions: builder.query<
      ReturnType<typeof GradingRevisionListResponseSchema.parse>['revisions'],
      string
    >({
      query: (id) => `/grading/${id}/revisions`,
      transformResponse: (value: unknown) =>
        GradingRevisionListResponseSchema.parse(value).revisions,
      providesTags: (_r, _e, id) => [{ type: 'Grading', id: `REVISIONS-${id}` }],
    }),
  }),
});
export const {
  useGetGradingReferencesQuery,
  useGetGradingEntryQuery,
  useGetGradingEntriesQuery,
  useCreateGradingEntryMutation,
  useCancelGradingEntryMutation,
  useReviseGradingEntryMutation,
  useGetGradingRevisionsQuery,
} = gradingApi;
