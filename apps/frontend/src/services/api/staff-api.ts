import {
  CreateStaffSchema,
  StaffListResponseSchema,
  StaffResponseSchema,
  type CreateStaffInput,
  type Staff,
  type StaffListResponse,
} from '@dhakad/shared';
import { baseApi } from './base-api';
export const staffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStaffList: builder.query<
      StaffListResponse,
      { search?: string; status: 'active' | 'inactive' | 'all'; page: number; pageSize?: number }
    >({
      query: (params) => ({ url: '/staff', params }),
      transformResponse: (value: unknown) => StaffListResponseSchema.parse(value),
      providesTags: (result) =>
        result
          ? [
              { type: 'Staff', id: 'LIST' },
              ...result.staff.map(({ id }) => ({ type: 'Staff' as const, id })),
            ]
          : [{ type: 'Staff', id: 'LIST' }],
    }),
    getStaff: builder.query<Staff, string>({
      query: (id) => `/staff/${id}`,
      transformResponse: (value: unknown) => StaffResponseSchema.parse(value).staff,
      providesTags: (_r, _e, id) => [{ type: 'Staff', id }],
    }),
    createStaff: builder.mutation<Staff, CreateStaffInput>({
      query: (body) => ({ url: '/staff', method: 'POST', body: CreateStaffSchema.parse(body) }),
      transformResponse: (value: unknown) => StaffResponseSchema.parse(value).staff,
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),
    setStaffStatus: builder.mutation<Staff, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/staff/${id}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      transformResponse: (value: unknown) => StaffResponseSchema.parse(value).staff,
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Staff', id },
        { type: 'Staff', id: 'LIST' },
      ],
    }),
  }),
});
export const {
  useGetStaffListQuery,
  useGetStaffQuery,
  useCreateStaffMutation,
  useSetStaffStatusMutation,
} = staffApi;
