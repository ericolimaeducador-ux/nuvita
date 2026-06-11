export interface CursorPaginationInput {
  limit?: number;
  cursor?: string;
}

export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
