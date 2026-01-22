export interface Class {
    id: number;
    name: string;
}

export interface GetClassesResponse {
  message: string;
  classes: Class[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}
