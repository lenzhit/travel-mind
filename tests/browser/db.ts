import { TEST_DATABASE_URL } from "./environment";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
export const conn = postgres(TEST_DATABASE_URL, { max: 1 });
export const db = drizzle(conn);
