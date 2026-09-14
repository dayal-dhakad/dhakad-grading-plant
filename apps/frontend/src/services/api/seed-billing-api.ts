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
      {
        status: 'active' | 'cancelled' | 'all';
        customerId?: string;
        page: number;
        pageSize: number;
      }
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
export const { useGetSeedBillsQuery, useCreateSeedBillMutation, useCancelSeedBillMutation } =
  seedBillingApi;
