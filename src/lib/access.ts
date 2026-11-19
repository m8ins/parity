// Accept UUIDs without assuming a generation/version; never query malformed IDs.
export const isObjectId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function isMissingSession(error: { name?: string; status?: number; code?: string } | null) {
  return error?.name === 'AuthSessionMissingError' || error?.status === 401 || error?.status === 403 || ['session_not_found', 'refresh_token_not_found', 'bad_jwt'].includes(error?.code ?? '');
}
