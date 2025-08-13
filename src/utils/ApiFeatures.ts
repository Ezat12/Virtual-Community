import { eq, and, sql, SQL } from "drizzle-orm";
import { AnyPgTable, PgColumn, PgSelect } from "drizzle-orm/pg-core";
import { ParsedQs } from "qs";

type ColumnMap = {
  [key: string]: PgColumn | SQL;
};

type JoinType = "inner" | "left" | "right" | "full";

interface JoinClause {
  table: AnyPgTable;
  condition: SQL;
  type: JoinType;
}

export class ApiFeatures<T> {
  private db: any;
  private queryBase: AnyPgTable;
  private queryParams: ParsedQs;
  private columnMap: ColumnMap;
  private selectedFields: Record<string, PgColumn | SQL> | undefined;
  private filters: SQL[] = [];
  private sortFields: SQL<unknown>[] = [];
  private joins: JoinClause[] = [];
  private limitVal: number = 10;
  private offsetVal: number = 0;

  constructor(
    db: any,
    queryBase: AnyPgTable,
    queryParams: ParsedQs,
    columnMap: ColumnMap
  ) {
    this.db = db;
    this.queryBase = queryBase;
    this.queryParams = queryParams;
    this.columnMap = columnMap;
  }

  /**
   * Add filtering conditions
   */
  filter(): this {
    const excluded = ["sort", "fields", "page", "limit"];
    const queryObj = { ...this.queryParams };
    excluded.forEach((f) => delete queryObj[f]);

    Object.entries(queryObj).forEach(([key, value]) => {
      const column = this.columnMap[key];
      if (column && typeof value === "string") {
        if (value.startsWith("gte:")) {
          this.filters.push(sql`${column} >= ${value.slice(4)}`);
        } else if (value.startsWith("lte:")) {
          this.filters.push(sql`${column} <= ${value.slice(4)}`);
        } else if (value.startsWith("gt:")) {
          this.filters.push(sql`${column} > ${value.slice(3)}`);
        } else if (value.startsWith("lt:")) {
          this.filters.push(sql`${column} < ${value.slice(3)}`);
        } else if (value.includes(",")) {
          const values = value.split(",");
          this.filters.push(sql`${column} IN (${values})`);
        } else {
          this.filters.push(eq(column as PgColumn, value));
        }
      }
    });

    return this;
  }

  /**
   * Add sorting
   */
  sort(): this {
    const sortBy = this.queryParams.sort as string;
    if (sortBy) {
      this.sortFields = sortBy.split(",").flatMap((f) => {
        const order = f.startsWith("-") ? "desc" : "asc";
        const field = f.replace(/^-/, "");
        const column = this.columnMap[field];

        if (!column) return [];

        // Always wrap column in sql to ensure it's SQL<unknown>
        const sqlColumn = column instanceof PgColumn ? sql`${column}` : column;
        if (order === "desc") {
          return [sql`${sqlColumn} DESC`];
        }
        return [sqlColumn];
      });
    }
    return this;
  }

  /**
   * Select specific fields
   */
  selectFields(): this {
    const fields = this.queryParams.fields as string;
    if (fields) {
      const selected = fields
        .split(",")
        .map((f) => [f, this.columnMap[f]])
        .filter(([_, col]) => col)
        .map(([key, col]) => [
          key,
          col instanceof PgColumn ? col : sql`${col}`,
        ]);

      this.selectedFields = Object.fromEntries(selected);
    }
    return this;
  }

  /**
   * Add pagination
   */
  paginate(): this {
    const page = parseInt(this.queryParams.page as string) || 1;
    const limit = parseInt(this.queryParams.limit as string) || 10;
    this.limitVal = limit;
    this.offsetVal = (page - 1) * limit;
    return this;
  }

  /**
   * Add JOIN clause
   */
  join(table: AnyPgTable, condition: SQL, type: JoinType = "inner"): this {
    this.joins.push({ table, condition, type });
    return this;
  }

  /**
   * Build the final query
   */
  build(): PgSelect {
    // Initialize query with selected fields or all columns from columnMap
    let query = this.db
      .select(this.selectedFields || this.columnMap)
      .from(this.queryBase);

    // Apply joins
    this.joins.forEach(({ table, condition, type }) => {
      switch (type) {
        case "inner":
          query = query.innerJoin(table, condition);
          break;
        case "left":
          query = query.leftJoin(table, condition);
          break;
        case "right":
          query = query.rightJoin(table, condition);
          break;
        case "full":
          query = query.fullJoin(table, condition);
          break;
      }
    });

    // Apply where
    if (this.filters.length > 0) {
      query = query.where(and(...this.filters));
    }

    // Apply orderBy
    if (this.sortFields.length > 0) {
      query = query.orderBy(...this.sortFields);
    }

    // Apply limit and offset
    return query.limit(this.limitVal).offset(this.offsetVal);
  }
}
