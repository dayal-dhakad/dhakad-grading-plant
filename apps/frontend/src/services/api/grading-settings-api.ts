import {
  CreateCropSettingSchema,
  CropSettingListResponseSchema,
  CropSettingResponseSchema,
  UpdateCropSettingSchema,
  type CreateCropSettingInput,
  type CropSetting,
  type UpdateCropSettingInput,
} from '@dhakad/shared';
import { baseApi } from './base-api';
export const gradingSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCropSettings: builder.query<ReturnType<typeof CropSettingListResponseSchema.parse>, void>({
      query: () => '/grading-settings',
      transformResponse: (value: unknown) => CropSettingListResponseSchema.parse(value),
      providesTags: [{ type: 'CropSetting', id: 'LIST' }],
    }),
    createCropSetting: builder.mutation<CropSetting, CreateCropSettingInput>({
      query: (body) => ({
        url: '/grading-settings',
        method: 'POST',
        body: CreateCropSettingSchema.parse(body),
      }),
      transformResponse: (value: unknown) => CropSettingResponseSchema.parse(value).crop,
      invalidatesTags: [
        { type: 'CropSetting', id: 'LIST' },
        { type: 'GradingReference', id: 'LIST' },
      ],
    }),
    updateCropSetting: builder.mutation<CropSetting, { id: string; input: UpdateCropSettingInput }>(
      {
        query: ({ id, input }) => ({
          url: `/grading-settings/${id}`,
          method: 'PATCH',
          body: UpdateCropSettingSchema.parse(input),
        }),
        transformResponse: (value: unknown) => CropSettingResponseSchema.parse(value).crop,
        invalidatesTags: [
          { type: 'CropSetting', id: 'LIST' },
          { type: 'GradingReference', id: 'LIST' },
        ],
      },
    ),
    setCropStatus: builder.mutation<CropSetting, { id: string; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/grading-settings/${id}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      transformResponse: (value: unknown) => CropSettingResponseSchema.parse(value).crop,
      invalidatesTags: [
        { type: 'CropSetting', id: 'LIST' },
        { type: 'GradingReference', id: 'LIST' },
      ],
    }),
  }),
});
export const {
  useGetCropSettingsQuery,
  useCreateCropSettingMutation,
  useUpdateCropSettingMutation,
  useSetCropStatusMutation,
} = gradingSettingsApi;
