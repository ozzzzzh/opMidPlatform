import type { ApiResponse } from '@it-ops/shared';
import axios, { AxiosRequestConfig } from 'axios';
import { clearStoredToken, getStoredToken } from '@/auth/storage';
import { currentLanguage } from '@/i18n/I18nContext';

export const http = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

http.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const requestUrl = error.config?.url ?? '';
      const isAuthRequest =
        requestUrl.includes('/auth/login') || requestUrl.includes('/auth/logout');

      if (!isAuthRequest) {
        clearStoredToken();
        const pathname = window.location.pathname;
        const isPublicPage =
          pathname === '/login' ||
          pathname === '/report' ||
          pathname === '/tickets/new' ||
          pathname === '/track' ||
          pathname.startsWith('/track/') ||
          pathname === '/';
        if (!isPublicPage) {
          const redirect = `${pathname}${window.location.search}`;
          window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`);
        }
      }
    }

    return Promise.reject(error);
  },
);

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.get<ApiResponse<T>>(url, config);
  return response.data.data;
}

export async function apiPost<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await http.post<ApiResponse<T>>(url, body, config);
  return response.data.data;
}

export async function apiPatch<T, B = unknown>(
  url: string,
  body?: B,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await http.patch<ApiResponse<T>>(url, body, config);
  return response.data.data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.delete<ApiResponse<T>>(url, config);
  return response.data.data;
}

const SERVER_ERROR_EN: Record<string, string> = {
  用户名或密码错误: 'Invalid username or password',
  '账号已停用，请联系管理员': 'Account disabled. Contact an administrator.',
  账号已停用: 'Account disabled',
  登录已过期: 'Session expired. Sign in again.',
  '登录已过期，请重新登录': 'Session expired. Sign in again.',
  请先登录: 'Sign in required',
  权限不足: 'Insufficient permissions',
  用户不存在: 'User not found',
  工单不存在: 'Ticket not found',
  知识不存在: 'Knowledge item not found',
  联系人不存在: 'Contact not found',
  该系统中已存在同名联系人: 'A contact with this name already exists for the system',
  文档不存在: 'Document not found',
  图片不存在: 'Image not found',
  知识空间不合法: 'Invalid knowledge space',
  文档类型不合法: 'Invalid document type',
  长文档不支持在平台内编辑: 'Documents cannot be edited in the platform',
  仅长文档支持该操作: 'Only documents support this action',
  请选择要上传的文档: 'Select a document to upload',
  请选择要上传的图片: 'Select images to upload',
  '仅支持 PDF、Word、Excel、Markdown、TXT 文件':
    'Only PDF, Word, Excel, Markdown and TXT files are supported',
  未找到工单进度: 'Ticket progress not found',
  工单号或查询码不正确: 'Ticket number or access code is incorrect',
  仅待认领的工单可以认领: 'Only open tickets can be claimed',
  仅处理中的工单可以标记解决: 'Only in-progress tickets can be resolved',
  工单已关闭: 'Ticket is already closed',
  已关闭的工单不能继续评论: 'Closed tickets cannot be commented on',
  '工单状态已变化，请刷新后重试': 'The ticket changed. Refresh and try again.',
  期望完成时间必须晚于当前时间: 'Expected completion must be later than the current time',
  期望完成时间格式不正确: 'Invalid expected completion time',
  '仅支持 PNG、JPEG、WebP、GIF 图片': 'Only PNG, JPEG, WebP and GIF images are supported',
  单张图片不能超过10MB: 'Each image must be 10MB or smaller',
  '单张图片不能超过 10MB': 'Each image must be 10MB or smaller',
  最多上传5张图片: 'Up to 5 images can be uploaded',
  '最多上传 5 张图片': 'Up to 5 images can be uploaded',
};

export function getErrorMessage(error: unknown): string {
  const english = currentLanguage() === 'en';

  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (Array.isArray(message)) return message.map(String).join('; ');
    if (typeof message === 'string' && message) {
      return english ? (SERVER_ERROR_EN[message] ?? message) : message;
    }
    if (error.code === 'ECONNABORTED') {
      return english ? 'Request timed out. Try again later.' : '请求超时，请稍后重试';
    }
    if (!error.response) {
      return english
        ? 'Cannot reach the server. Check your network or backend service.'
        : '无法连接服务器，请检查网络或后端服务';
    }
    return error.message;
  }

  if (error instanceof Error) return error.message;
  return english ? 'Operation failed. Try again later.' : '操作失败，请稍后重试';
}
