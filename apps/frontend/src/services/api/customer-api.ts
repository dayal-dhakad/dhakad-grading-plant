import {
  CreateCustomerSchema,
  CustomerGradingDueResponseSchema,
  CustomerDuesResponseSchema,
  CustomerListResponseSchema,
  CustomerResponseSchema,
  UpdateCustomerSchema,
  type CreateCustomerInput,
  type Customer,
  type CustomerListResponse,
  type UpdateCustomerInput,
} from '@dhakad/shared';
import { baseApi } from './base-api';

export type CustomerListParams = {
  search?: string;
  status: 'active' | 'inactive' | 'all';
  page: number;
  pageSize?: number;
};
export const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomer: builder.query<Customer, string>({
      query: (id) => `/customers/${id}`,
      transformResponse: (response: unknown) => CustomerResponseSchema.parse(response).customer,
      providesTags: (_result, _error, id) => [{ type: 'Customer', id }],
    }),
    getCustomerGradingDue: builder.query<string, string>({
      query: (id) => `/customers/${id}/grading-due`,
      transformResponse: (response: unknown) =>
        CustomerGradingDueResponseSchema.parse(response).totalDue,
      providesTags: (_result, _error, id) => [{ type: 'Grading', id: `DUE-${id}` }],
    }),
    getCustomerDues: builder.query<ReturnType<typeof CustomerDuesResponseSchema.parse>, string>({
      query: (id) => `/customers/${id}/dues`,
      transformResponse: (response: unknown) => CustomerDuesResponseSchema.parse(response),
      providesTags: (_result, _error, id) => [{ type: 'Grading', id: `DUE-${id}` }],
    }),
    getCustomers: builder.query<CustomerListResponse, CustomerListParams>({
      query: ({ search, status, page, pageSize = 20 }) => ({
        url: '/customers',
        params: { ...(search ? { search } : {}), status, page, pageSize },
      }),
      transformResponse: (response: unknown) => CustomerListResponseSchema.parse(response),
      providesTags: (result) =>
        result
          ? [
              { type: 'Customer', id: 'LIST' },
              ...result.customers.map(({ id }) => ({ type: 'Customer' as const, id })),
            ]
          : [{ type: 'Customer', id: 'LIST' }],
    }),
    createCustomer: builder.mutation<Customer, CreateCustomerInput>({
      query: (body) => ({
        url: '/customers',
        method: 'POST',
        body: CreateCustomerSchema.parse(body),
      }),
      transformResponse: (response: unknown) => CustomerResponseSchema.parse(response).customer,
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }],
    }),
    updateCustomer: builder.mutation<Customer, { id: string; input: UpdateCustomerInput }>({
      query: ({ id, input }) => ({
        url: `/customers/${id}`,
        method: 'PATCH',
        body: UpdateCustomerSchema.parse(input),
      }),
      transformResponse: (response: unknown) => CustomerResponseSchema.parse(response).customer,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
      ],
    }),
    setCustomerStatus: builder.mutation<Customer, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/customers/${id}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      transformResponse: (response: unknown) => CustomerResponseSchema.parse(response).customer,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
      ],
    }),
  }),
});
export const {
  useGetCustomerQuery,
  useGetCustomerGradingDueQuery,
  useGetCustomerDuesQuery,
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useSetCustomerStatusMutation,
} = customerApi;
