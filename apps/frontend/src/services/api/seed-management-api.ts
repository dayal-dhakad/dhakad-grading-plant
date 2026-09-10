import {
  AddSeedStockSchema,
  CreateSeedCategorySchema,
  CreateSeedProductSchema,
  SeedCategorySchema,
  SeedProductDetailResponseSchema,
  SeedProductListResponseSchema,
  SeedProductResponseSchema,
  UpdateSeedProductSchema,
  type AddSeedStockInput,
  type CreateSeedProductInput,
  type SeedProduct,
  type UpdateSeedProductInput,
} from '@dhakad/shared';
import { baseApi } from './base-api';

export const seedManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSeedProducts: builder.query<
      ReturnType<typeof SeedProductListResponseSchema.parse>,
      { search?: string; status: 'active' | 'inactive' | 'all'; page: number; pageSize: number }
    >({
      query: (params) => ({ url: '/seed-management', params }),
      transformResponse: (value: unknown) => SeedProductListResponseSchema.parse(value),
      providesTags: [{ type: 'SeedProduct', id: 'LIST' }],
    }),
    getSeedProduct: builder.query<
      ReturnType<typeof SeedProductDetailResponseSchema.parse>,
      { id: string; page: number; pageSize: number }
    >({
      query: ({ id, ...params }) => ({ url: `/seed-management/${id}`, params }),
      transformResponse: (value: unknown) => SeedProductDetailResponseSchema.parse(value),
      providesTags: (_result, _error, { id }) => [{ type: 'SeedProduct', id }],
    }),
    createSeedCategory: builder.mutation<
      ReturnType<typeof SeedCategorySchema.parse>,
      { name: string }
    >({
      query: (body) => ({
        url: '/seed-management/categories',
        method: 'POST',
        body: CreateSeedCategorySchema.parse(body),
      }),
      transformResponse: (value: unknown) =>
        SeedCategorySchema.parse((value as { category: unknown }).category),
      invalidatesTags: [{ type: 'SeedProduct', id: 'LIST' }],
    }),
    createSeedProduct: builder.mutation<SeedProduct, CreateSeedProductInput>({
      query: (body) => ({
        url: '/seed-management',
        method: 'POST',
        body: CreateSeedProductSchema.parse(body),
      }),
      transformResponse: (value: unknown) => SeedProductResponseSchema.parse(value).product,
      invalidatesTags: [{ type: 'SeedProduct', id: 'LIST' }],
    }),
    updateSeedProduct: builder.mutation<SeedProduct, { id: string; input: UpdateSeedProductInput }>(
      {
        query: ({ id, input }) => ({
          url: `/seed-management/${id}`,
          method: 'PATCH',
          body: UpdateSeedProductSchema.parse(input),
        }),
        transformResponse: (value: unknown) => SeedProductResponseSchema.parse(value).product,
        invalidatesTags: (_result, _error, { id }) => [
          { type: 'SeedProduct', id },
          { type: 'SeedProduct', id: 'LIST' },
        ],
      },
    ),
    setSeedStatus: builder.mutation<SeedProduct, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/seed-management/${id}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      transformResponse: (value: unknown) => SeedProductResponseSchema.parse(value).product,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SeedProduct', id },
        { type: 'SeedProduct', id: 'LIST' },
      ],
    }),
    addSeedStock: builder.mutation<SeedProduct, { id: string; input: AddSeedStockInput }>({
      query: ({ id, input }) => ({
        url: `/seed-management/${id}/stock`,
        method: 'POST',
        body: AddSeedStockSchema.parse(input),
      }),
      transformResponse: (value: unknown) => SeedProductResponseSchema.parse(value).product,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SeedProduct', id },
        { type: 'SeedProduct', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useAddSeedStockMutation,
  useCreateSeedCategoryMutation,
  useCreateSeedProductMutation,
  useGetSeedProductQuery,
  useGetSeedProductsQuery,
  useSetSeedStatusMutation,
  useUpdateSeedProductMutation,
} = seedManagementApi;
