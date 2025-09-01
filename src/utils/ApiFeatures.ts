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

    console.log("Processing query params:", queryObj); // Debug log

    Object.entries(queryObj).forEach(([key, value]) => {
      if (typeof value !== "string") {
        console.log(`Skipping non-string param: ${key}=${value}`); // Debug log
        return;
      }

      const column = this.columnMap[key];
      if (!column) {
        console.log(`Skipping unknown column: ${key}`); // Debug log
        return;
      }

      console.log(`Processing filter for ${key}=${value}`); // Debug log

      if (key === "userRole") {
        if (value === "owner") {
          this.filters.push(
            sql`${this.columnMap.communityCreatedBy} = ${this.columnMap.userId}`
          );
          console.log("Added filter for userRole=owner"); // Debug log
        } else if (value === "admin") {
          this.filters.push(sql`EXISTS (
            SELECT 1 FROM community_admins 
            WHERE community_admins.user_id = ${this.columnMap.userId} 
            AND community_admins.community_id = ${this.columnMap.communityId}
          )`);
          console.log("Added filter for userRole=admin"); // Debug log
        } else if (value === "member") {
          this.filters.push(sql`NOT EXISTS (
            SELECT 1 FROM community_admins 
            WHERE community_admins.user_id = ${this.columnMap.userId} 
            AND community_admins.community_id = ${this.columnMap.communityId}
          )`);
          console.log("Added filter for userRole=member"); // Debug log
        } else {
          console.log(`Invalid userRole value: ${value}`); // Debug log
        }
      } else if (column instanceof PgColumn) {
        if (key === "userName" || key === "userEmail") {
          this.filters.push(sql`${column} ILIKE ${`%${value}%`}`);
          console.log(`Added ILIKE filter for ${key}=${value}`); // Debug log
        } else if (value.startsWith("gte:")) {
          this.filters.push(sql`${column} >= ${value.slice(4)}`);
          console.log(`Added gte filter for ${key}=${value}`); // Debug log
        } else if (value.startsWith("lte:")) {
          this.filters.push(sql`${column} <= ${value.slice(4)}`);
          console.log(`Added lte filter for ${key}=${value}`); // Debug log
        } else if (value.startsWith("gt:")) {
          this.filters.push(sql`${column} > ${value.slice(3)}`);
          console.log(`Added gt filter for ${key}=${value}`); // Debug log
        } else if (value.startsWith("lt:")) {
          this.filters.push(sql`${column} < ${value.slice(3)}`);
          console.log(`Added lt filter for ${key}=${value}`); // Debug log
        } else if (value.includes(",")) {
          const values = value.split(",");
          this.filters.push(sql`${column} IN (${values})`);
          console.log(`Added IN filter for ${key}=${value}`); // Debug log
        } else {
          this.filters.push(eq(column, value));
          console.log(`Added eq filter for ${key}=${value}`); // Debug log
        }
      } else {
        this.filters.push(sql`${column} = ${value}`);
        console.log(`Added SQL filter for ${key}=${value}`); // Debug log
      }
    });

    console.log("Final filters:", this.filters); // Debug log
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

        if (!column) {
          console.log(`Skipping unknown sort field: ${field}`); // Debug log
          return [];
        }

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
    let query = this.db
      .select(this.selectedFields || this.columnMap)
      .from(this.queryBase);

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

    if (this.filters.length > 0) {
      query = query.where(and(...this.filters));
    }

    if (this.sortFields.length > 0) {
      query = query.orderBy(...this.sortFields);
    }

    return query.limit(this.limitVal).offset(this.offsetVal);
  }
}