import { HealthResponseSchema, type HealthResponse } from '@dhakad/shared';
import { baseApi } from './base-api';
export const healthApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHealth: builder.query<HealthResponse, void>({
      query: () => '/health',
      transformResponse: (response: unknown) => HealthResponseSchema.parse(response),
    }),
  }),
});
export const { useGetHealthQuery } = healthApi;
