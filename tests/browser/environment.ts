export const TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/travelmind_e2e_test";
export const TEST_ORIGIN = "http://localhost:3100";
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.APP_MODE = "demo";
