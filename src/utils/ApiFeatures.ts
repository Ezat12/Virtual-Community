import { eq, and, sql } from "drizzle-orm";
import { ParsedQs } from "qs";
import { AnyTable } from "drizzle-orm";
import { AnyPgTable } from "drizzle-orm/pg-core";

type ColumnMap = {
  [key: string]: any;
};

export class ApiFeatures<T> {
  private db: any;
  private table: AnyPgTable;
  private queryParams: ParsedQs;
  private columnMap: ColumnMap;
  private selectedFields?: any;

  private filters: any[] = [];
  private sortFields: any[] = [];
  private limitVal: number = 10;
  private offsetVal: number = 0;

  constructor(
    db: any,
    table: AnyPgTable,
    queryParams: ParsedQs,
    columnMap: ColumnMap
  ) {
    this.db = db;
    this.table = table;
    this.queryParams = queryParams;
    this.columnMap = columnMap;
  }

  filter() {
    const excluded = ["sort", "fields", "page", "limit"];
    const queryObj = { ...this.queryParams };
    excluded.forEach((f) => delete queryObj[f]);

    Object.entries(queryObj).forEach(([key, value]) => {
      const column = this.columnMap[key];
      if (column && typeof value === "string") {
        if (value.startsWith("gte:"))
          this.filters.push(sql`${column} >= ${value.slice(4)}`);
        else if (value.startsWith("lte:"))
          this.filters.push(sql`${column} <= ${value.slice(4)}`);
        else if (value.startsWith("gt:"))
          this.filters.push(sql`${column} > ${value.slice(3)}`);
        else if (value.startsWith("lt:"))
          this.filters.push(sql`${column} < ${value.slice(3)}`);
        else this.filters.push(eq(column, value));
      }
    });

    return this;
  }

  sort() {
    const sortBy = this.queryParams.sort as string;
    if (sortBy) {
      const fields = sortBy
        .split(",")
        .map((f) => {
          const order = f.startsWith("-") ? "desc" : "asc";
          const field = f.replace("-", "");
          const column = this.columnMap[field];
          if (column) return order === "desc" ? sql`${column} DESC` : column;
          return null;
        })
        .filter(Boolean);

      this.sortFields = fields;
    }

    return this;
  }

  selectFields() {
    const fields = this.queryParams.fields as string;
    if (fields) {
      const selected = fields
        .split(",")
        .map((f) => [f, this.columnMap[f]])
        .filter(([_, col]) => col);

      this.selectedFields = Object.fromEntries(selected);
    }

    return this;
  }

  paginate() {
    const page = parseInt(this.queryParams.page as string) || 1;
    const limit = parseInt(this.queryParams.limit as string) || 10;
    this.limitVal = limit;
    this.offsetVal = (page - 1) * limit;

    return this;
  }

  build() {
    let query;

    if (this.selectedFields) {
      query = this.db.select(this.selectedFields).from(this.table);
    } else {
      query = this.db.select().from(this.table);
    }

    if (this.filters.length > 0) {
      query = query.where(and(...this.filters));
    }

    if (this.sortFields.length > 0) {
      query = query.orderBy(...this.sortFields);
    }

    query = query.limit(this.limitVal).offset(this.offsetVal);

    return query;
  }
}
