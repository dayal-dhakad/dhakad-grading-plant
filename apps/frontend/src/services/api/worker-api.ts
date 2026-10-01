import {
  CreateWorkerPaymentSchema,
  CreateWorkerSchema,
  WorkerDetailResponseSchema,
  WorkerListResponseSchema,
  WorkerPaymentListResponseSchema,
  WorkerPaymentResponseSchema,
  WorkerPaymentSummarySchema,
  type CreateWorkerInput,
  type CreateWorkerPaymentInput,
} from '@dhakad/shared';
import { baseApi } from './base-api';
export const workerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkers: builder.query<
      ReturnType<typeof WorkerListResponseSchema.parse>,
      { search?: string; page: number; pageSize: number }
    >({
      query: (params) => ({ url: '/workers', params }),
      transformResponse: (v: unknown) => WorkerListResponseSchema.parse(v),
      providesTags: [{ type: 'Worker', id: 'LIST' }],
    }),
    getWorker: builder.query<ReturnType<typeof WorkerDetailResponseSchema.parse>['worker'], string>(
      {
        query: (id) => `/workers/${id}`,
        transformResponse: (v: unknown) => WorkerDetailResponseSchema.parse(v).worker,
        providesTags: (_r, _e, id) => [{ type: 'Worker', id }],
      },
    ),
    createWorker: builder.mutation<
      ReturnType<typeof WorkerDetailResponseSchema.parse>['worker'],
      CreateWorkerInput
    >({
      query: (body) => ({ url: '/workers', method: 'POST', body: CreateWorkerSchema.parse(body) }),
      transformResponse: (v: unknown) => WorkerDetailResponseSchema.parse(v).worker,
      invalidatesTags: [{ type: 'Worker', id: 'LIST' }],
    }),
    getWorkerPayments: builder.query<
      ReturnType<typeof WorkerPaymentListResponseSchema.parse>,
      { id: string; page: number; pageSize: number }
    >({
      query: ({ id, ...params }) => ({ url: `/workers/${id}/payments`, params }),
      transformResponse: (v: unknown) => WorkerPaymentListResponseSchema.parse(v),
      providesTags: (_r, _e, x) => [{ type: 'Worker', id: `${x.id}-PAYMENTS` }],
    }),
    getWorkerPaymentSummary: builder.query<
      ReturnType<typeof WorkerPaymentSummarySchema.parse>,
      { from?: string; to?: string }
    >({
      query: (params) => ({ url: '/workers/payment-summary', params }),
      transformResponse: (value: unknown) => WorkerPaymentSummarySchema.parse(value),
      providesTags: [{ type: 'Worker', id: 'PAYMENT_SUMMARY' }],
    }),
    createWorkerPayment: builder.mutation<
      ReturnType<typeof WorkerPaymentResponseSchema.parse>['payment'],
      { id: string; input: CreateWorkerPaymentInput }
    >({
      query: ({ id, input }) => ({
        url: `/workers/${id}/payments`,
        method: 'POST',
        body: CreateWorkerPaymentSchema.parse(input),
      }),
      transformResponse: (v: unknown) => WorkerPaymentResponseSchema.parse(v).payment,
      invalidatesTags: (_r, _e, x) => [
        { type: 'Worker', id: 'LIST' },
        { type: 'Worker', id: x.id },
        { type: 'Worker', id: `${x.id}-PAYMENTS` },
        { type: 'Worker', id: 'PAYMENT_SUMMARY' },
        { type: 'Report', id: 'OVERVIEW' },
      ],
    }),
  }),
});
export const {
  useGetWorkersQuery,
  useGetWorkerQuery,
  useCreateWorkerMutation,
  useGetWorkerPaymentsQuery,
  useCreateWorkerPaymentMutation,
  useGetWorkerPaymentSummaryQuery,
} = workerApi;
