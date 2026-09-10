import {
  CreateSeedBillSchema,
  SeedBillListResponseSchema,
  SeedBillResponseSchema,
  type CreateSeedBillInput,
} from '@dhakad/shared';
import { baseApi } from './base-api';
export const seedBillingApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getSeedBills: b.query<
      ReturnType<typeof SeedBillListResponseSchema.parse>,
      { status: 'active' | 'cancelled' | 'all'; page: number; pageSize: number }
    >({
      query: (params) => ({ url: '/seed-bills', params }),
      transformResponse: (v: unknown) => SeedBillListResponseSchema.parse(v),
      providesTags: [{ type: 'SeedBill', id: 'LIST' }],
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
        { type: 'Grading', id: `DUE-${customerId}` },
      ],
    }),
    cancelSeedBill: b.mutation<void, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/seed-bills/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: [
        { type: 'SeedBill', id: 'LIST' },
        { type: 'SeedProduct', id: 'LIST' },
        { type: 'Ledger', id: 'LIST' },
      ],
    }),
  }),
});
export const { useGetSeedBillsQuery, useCreateSeedBillMutation, useCancelSeedBillMutation } =
  seedBillingApi;
