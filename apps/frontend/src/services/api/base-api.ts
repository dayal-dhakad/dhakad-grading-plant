import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { frontendEnv } from '@/app/config/env';
export const baseApi = createApi({
  reducerPath: 'api',
  tagTypes: [
    'Customer',
    'Grading',
    'Staff',
    'CropSetting',
    'GradingReference',
    'Payment',
    'Ledger',
    'SeedProduct',
    'SeedBill',
    'PaymentAccount',
    'Notification',
    'Expense',
    'Report',
  ],
  baseQuery: fetchBaseQuery({ baseUrl: frontendEnv.VITE_API_BASE_URL, credentials: 'include' }),
  endpoints: () => ({}),
});
