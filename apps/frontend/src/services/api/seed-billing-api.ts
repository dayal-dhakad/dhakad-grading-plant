import {
  CreateSeedBillSchema,
  SeedBillListResponseSchema,
  SeedBillResponseSchema,
  SeedBillRevisionListResponseSchema,
  ReviseSeedBillSchema,
  type CreateSeedBillInput,
  type ReviseSeedBillInput,
} from '@dhakad/shared';
import { baseApi } from './base-api';
export const seedBillingApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getSeedBillingConfig: b.query<{ gstRate: string }, void>({
      query: () => '/seed-bills/config/gst',
    }),
    getSeedBills: b.query<
      ReturnType<typeof SeedBillListResponseSchema.parse>,
      {
        status: 'active' | 'cancelled' | 'all';
        customerId?: string;
        from?: string;
        to?: string;
        page: number;
        pageSize: number;
      }
    >({
      query: (params) => ({ url: '/seed-bills', params }),
      transformResponse: (v: unknown) => SeedBillListResponseSchema.parse(v),
      providesTags: [{ type: 'SeedBill', id: 'LIST' }],
    }),
    getSeedBill: b.query<ReturnType<typeof SeedBillResponseSchema.parse>['bill'], string>({
      query: (id) => `/seed-bills/${id}`,
      transformResponse: (v: unknown) => SeedBillResponseSchema.parse(v).bill,
      providesTags: (_result, _error, id) => [{ type: 'SeedBill', id }],
    }),
    getSeedBillRevisions: b.query<
      ReturnType<typeof SeedBillRevisionListResponseSchema.parse>['revisions'],
      string
    >({
      query: (id) => `/seed-bills/${id}/revisions`,
      transformResponse: (v: unknown) => SeedBillRevisionListResponseSchema.parse(v).revisions,
      providesTags: (_result, _error, id) => [{ type: 'SeedBill', id: `REVISIONS-${id}` }],
    }),
    reviseSeedBill: b.mutation<
      ReturnType<typeof SeedBillResponseSchema.parse>['bill'],
      { id: string; input: ReviseSeedBillInput; previousCustomerId: string }
    >({
      query: ({ id, input }) => ({
        url: `/seed-bills/${id}`,
        method: 'PUT',
        body: ReviseSeedBillSchema.parse(input),
      }),
      transformResponse: (v: unknown) => SeedBillResponseSchema.parse(v).bill,
      invalidatesTags: (bill, _error, { id, previousCustomerId }) => [
        { type: 'SeedBill', id },
        { type: 'SeedBill', id: 'LIST' },
        { type: 'SeedBill', id: `REVISIONS-${id}` },
        { type: 'SeedProduct', id: 'LIST' },
        { type: 'Ledger', id: 'LIST' },
        { type: 'Ledger', id: previousCustomerId },
        { type: 'Grading', id: `DUE-${previousCustomerId}` },
        ...(bill ? [{ type: 'Ledger' as const, id: bill.customer.id }] : []),
        ...(bill ? [{ type: 'Grading' as const, id: `DUE-${bill.customer.id}` }] : []),
      ],
    }),
    createSeedBill: b.mutation<
      ReturnType<typeof SeedBillResponseSchema.parse>['bill'],
      CreateSeedBillInput
    >({
      query: (body) => ({
        url: '/seed-bills',
        method: 'POST',
        body: CreateSeedBillSchema.parse(body),
      }),
      transformResponse: (v: unknown) => SeedBillResponseSchema.parse(v).bill,
      invalidatesTags: (_result, _error, { customerId }) => [
        { type: 'SeedBill', id: 'LIST' },
        { type: 'SeedProduct', id: 'LIST' },
        { type: 'Ledger', id: 'LIST' },
        { type: 'Ledger', id: customerId },
        { type: 'Grading', id: `DUE-${customerId}` },
      ],
    }),
    cancelSeedBill: b.mutation<
      ReturnType<typeof SeedBillResponseSchema.parse>['bill'],
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/seed-bills/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (v: unknown) => SeedBillResponseSchema.parse(v).bill,
      invalidatesTags: (bill) => [
        { type: 'SeedBill', id: 'LIST' },
        { type: 'SeedProduct', id: 'LIST' },
        { type: 'Ledger', id: 'LIST' },
        ...(bill
          ? [
              { type: 'Ledger' as const, id: bill.customer.id },
              { type: 'Grading' as const, id: `DUE-${bill.customer.id}` },
            ]
          : []),
      ],
    }),
  }),
});
export const {
  useGetSeedBillingConfigQuery,
  useGetSeedBillsQuery,
  useGetSeedBillQuery,
  useGetSeedBillRevisionsQuery,
  useReviseSeedBillMutation,
  useCreateSeedBillMutation,
  useCancelSeedBillMutation,
} = seedBillingApi;
