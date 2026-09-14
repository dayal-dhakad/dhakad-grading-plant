import {
  CreatePaymentAccountSchema,
  PaymentAccountListResponseSchema,
  PaymentAccountResponseSchema,
  PaymentQrRequestSchema,
  PaymentQrResponseSchema,
  UpdatePaymentAccountSchema,
  type CreatePaymentAccountInput,
  type PaymentAccount,
  type UpdatePaymentAccountInput,
} from '@dhakad/shared';
import { baseApi } from './base-api';

export const paymentAccountApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentAccounts: builder.query<PaymentAccount[], 'active' | 'inactive' | 'all'>({
      query: (status) => ({ url: '/payment-accounts', params: { status } }),
      transformResponse: (value: unknown) => PaymentAccountListResponseSchema.parse(value).accounts,
      providesTags: [{ type: 'PaymentAccount', id: 'LIST' }],
    }),
    createPaymentAccount: builder.mutation<PaymentAccount, CreatePaymentAccountInput>({
      query: (body) => ({
        url: '/payment-accounts',
        method: 'POST',
        body: CreatePaymentAccountSchema.parse(body),
      }),
      transformResponse: (value: unknown) => PaymentAccountResponseSchema.parse(value).account,
      invalidatesTags: [{ type: 'PaymentAccount', id: 'LIST' }],
    }),
    updatePaymentAccount: builder.mutation<
      PaymentAccount,
      { id: string; input: UpdatePaymentAccountInput }
    >({
      query: ({ id, input }) => ({
        url: `/payment-accounts/${id}`,
        method: 'PATCH',
        body: UpdatePaymentAccountSchema.parse(input),
      }),
      transformResponse: (value: unknown) => PaymentAccountResponseSchema.parse(value).account,
      invalidatesTags: [{ type: 'PaymentAccount', id: 'LIST' }],
    }),
    setPaymentAccountStatus: builder.mutation<PaymentAccount, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/payment-accounts/${id}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      transformResponse: (value: unknown) => PaymentAccountResponseSchema.parse(value).account,
      invalidatesTags: [{ type: 'PaymentAccount', id: 'LIST' }],
    }),
    createPaymentQr: builder.mutation<
      ReturnType<typeof PaymentQrResponseSchema.parse>,
      { id: string; amount: string; reference?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/payment-accounts/${id}/qr`,
        method: 'POST',
        body: PaymentQrRequestSchema.parse(body),
      }),
      transformResponse: (value: unknown) => PaymentQrResponseSchema.parse(value),
    }),
  }),
});

export const {
  useGetPaymentAccountsQuery,
  useCreatePaymentAccountMutation,
  useUpdatePaymentAccountMutation,
  useSetPaymentAccountStatusMutation,
  useCreatePaymentQrMutation,
} = paymentAccountApi;
