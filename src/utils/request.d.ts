// src/utils/request.d.ts
declare module '@/utils/request' {
  import type { AxiosRequestConfig, AxiosInstance } from 'axios';

  /** 业务错误时，默认 request 返回的“错误对象”结构（和你拦截器保持一致） */
  export interface RequestErrorLike {
    success: false;
    error: true;
    code?: number | string;
    message?: string;
    data: null;
    encrypt: boolean;
  }

  /**
   * 默认导出：与 request.js 对齐
   * - 你的拦截器已 unwrap 到“最里层 data”
   * - 业务失败时默认不会 throw，而是返回一个错误对象（见上）
   *   => 因此类型上表现为：Promise<T | RequestErrorLike>
   *   => 如果你不想写判断，建议用下面的 requestWithError（会 throw）
   */
  export default function request<T = any>(
    options: AxiosRequestConfig
  ): Promise<T | RequestErrorLike>;

  /** 直接暴露 axios 实例，方便偶尔用原生 axios 能力 */
  export const axiosInstance: AxiosInstance;

  /**
   * 严格版本：业务失败会 throw（拦截器已处理），返回 Promise<T>
   * - 适合你想用 try/catch 的场景
   */
  export function requestWithError<T = any>(
    options: AxiosRequestConfig
  ): Promise<T>;
}
