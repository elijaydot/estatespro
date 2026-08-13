export type ApiError = { code: string; message: string; field?: string };
export type ApiMeta = {
  request_id: string;
  page?: number;
  per_page?: number;
  total?: number;
  has_more?: boolean;
};

export function apiSuccess(data: unknown, requestId: string, pagination?: Record<string, unknown>) {
  return { data, meta: { request_id: requestId, ...(pagination ?? {}) }, error: null };
}

export function apiError(requestId: string, code: string, message: string, field?: string) {
  return { data: null, meta: { request_id: requestId }, error: { code, message, ...(field ? { field } : {}) } };
}

export type ApiListQuery = { page: number; perPage: number; status: string | null; sort: string };

export function parseApiListQuery(url: URL, allowedSorts: string[] = ['created_at', '-created_at']):
  | { ok: true; value: ApiListQuery }
  | { ok: false; field: string; message: string } {
  const page = Number(url.searchParams.get('page') ?? '1');
  const perPage = Number(url.searchParams.get('per_page') ?? '20');
  const sort = url.searchParams.get('sort') ?? '-created_at';
  if (!Number.isInteger(page) || page < 1) return { ok: false, field: 'page', message: 'page must be a positive integer.' };
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) return { ok: false, field: 'per_page', message: 'per_page must be between 1 and 100.' };
  if (!allowedSorts.includes(sort)) return { ok: false, field: 'sort', message: `sort must be one of: ${allowedSorts.join(', ')}.` };
  return { ok: true, value: { page, perPage, status: url.searchParams.get('filter[status]'), sort } };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}