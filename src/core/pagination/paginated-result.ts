export class PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class PaginatedResult<T> {
  meta: PaginatedMeta;
  data: T[];

  static of<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const result = new PaginatedResult<T>();
    result.data = data;
    result.meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
    return result;
  }
}
