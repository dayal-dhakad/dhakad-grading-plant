import { IndianMobileSchema } from '@dhakad/shared';
import { z } from 'zod';
import { baseApi } from './base-api';

export const AuthUserSchema = z.strictObject({
  id: z.string().min(1),
  mobile: IndianMobileSchema,
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'STAFF']),
});
export const AuthResponseSchema = z.strictObject({ user: AuthUserSchema });
export const ApiErrorResponseSchema = z.object({
  status: z.union([z.number(), z.string()]).optional(),
  data: z.object({
    error: z.object({
      code: z.string().optional(),
      message: z.string(),
      retryAfterSeconds: z.number().int().positive().optional(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }),
  }),
});
export const LoginInputSchema = z.strictObject({
  mobile: IndianMobileSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUser: builder.query<AuthUser, void>({
      query: () => '/auth/me',
      transformResponse: (response: unknown) => AuthResponseSchema.parse(response).user,
    }),
    login: builder.mutation<AuthUser, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: (response: unknown) => AuthResponseSchema.parse(response).user,
      async onQueryStarted(_input, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          void dispatch(authApi.util.upsertQueryData('getCurrentUser', undefined, data));
        } catch {
          /* The form presents request errors. */
        }
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_input, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(authApi.util.resetApiState());
        } catch {
          /* Keep the current session visible when sign-out fails. */
        }
      },
    }),
  }),
});
export const { useGetCurrentUserQuery, useLoginMutation, useLogoutMutation } = authApi;
