import {
  CreateExpenseSchema,
  ExpenseListResponseSchema,
  ExpenseResponseSchema,
  UpdateExpenseSchema,
  type CreateExpenseInput,
  type Expense,
  type ExpenseCategory,
  type UpdateExpenseInput,
} from '@dhakad/shared';
import { baseApi } from './base-api';
export type ExpenseQuery = {
  from?: string;
  to?: string;
  category?: ExpenseCategory;
  page: number;
  pageSize: number;
};
export const expenseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query<ReturnType<typeof ExpenseListResponseSchema.parse>, ExpenseQuery>({
      query: (params) => ({ url: '/expenses', params }),
      transformResponse: (v: unknown) => ExpenseListResponseSchema.parse(v),
      providesTags: [{ type: 'Expense', id: 'LIST' }],
    }),
    createExpense: builder.mutation<Expense, CreateExpenseInput>({
      query: (body) => ({
        url: '/expenses',
        method: 'POST',
        body: CreateExpenseSchema.parse(body),
      }),
      transformResponse: (v: unknown) => ExpenseResponseSchema.parse(v).expense,
      invalidatesTags: [
        { type: 'Expense', id: 'LIST' },
        { type: 'Report', id: 'OVERVIEW' },
      ],
    }),
    updateExpense: builder.mutation<Expense, { id: string; input: UpdateExpenseInput }>({
      query: ({ id, input }) => ({
        url: `/expenses/${id}`,
        method: 'PATCH',
        body: UpdateExpenseSchema.parse(input),
      }),
      transformResponse: (v: unknown) => ExpenseResponseSchema.parse(v).expense,
      invalidatesTags: [
        { type: 'Expense', id: 'LIST' },
        { type: 'Report', id: 'OVERVIEW' },
      ],
    }),
  }),
});
export const { useGetExpensesQuery, useCreateExpenseMutation, useUpdateExpenseMutation } =
  expenseApi;
