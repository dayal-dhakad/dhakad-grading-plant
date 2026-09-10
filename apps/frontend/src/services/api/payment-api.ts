import {
  CreatePaymentSchema,
  CustomerLedgerResponseSchema,
  PaymentListResponseSchema,
  PaymentResponseSchema,
  type CreatePaymentInput,
  type Payment,
  type PaymentListResponse,
} from '@dhakad/shared';
import { baseApi } from './base-api';
export const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayments: builder.query<
      PaymentListResponse,
      { search?: string; status: 'active' | 'reversed' | 'all'; page: number; pageSize?: number }
    >({
      query: (params) => ({ url: '/payments', params }),
      transformResponse: (value: unknown) => PaymentListResponseSchema.parse(value),
      providesTags: [{ type: 'Payment', id: 'LIST' }],
    }),
    createPayment: builder.mutation<Payment, CreatePaymentInput>({
      query: (body) => ({
        url: '/payments',
        method: 'POST',
        body: CreatePaymentSchema.parse(body),
      }),
      transformResponse: (value: unknown) => PaymentResponseSchema.parse(value).payment,
      invalidatesTags: (_r, _e, input) => [
        { type: 'Payment', id: 'LIST' },
        { type: 'Ledger', id: input.customerId },
        { type: 'Grading', id: `DUE-${input.customerId}` },
      ],
    }),
    reversePayment: builder.mutation<Payment, { id: string; customerId: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/payments/${id}/reverse`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (value: unknown) => PaymentResponseSchema.parse(value).payment,
      invalidatesTags: (_r, _e, input) => [
        { type: 'Payment', id: 'LIST' },
        { type: 'Ledger', id: input.customerId },
        { type: 'Grading', id: `DUE-${input.customerId}` },
      ],
    }),
    getCustomerLedger: builder.query<ReturnType<typeof CustomerLedgerResponseSchema.parse>, string>(
      {
        query: (customerId) => `/payments/customers/${customerId}/ledger`,
        transformResponse: (value: unknown) => CustomerLedgerResponseSchema.parse(value),
        providesTags: (_r, _e, id) => [{ type: 'Ledger', id }],
      },
    ),
  }),
});
export const {
  useGetPaymentsQuery,
  useCreatePaymentMutation,
  useReversePaymentMutation,
  useGetCustomerLedgerQuery,
} = paymentApi;
