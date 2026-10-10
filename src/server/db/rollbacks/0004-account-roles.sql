-- Falla de forma segura si siguen existiendo cuentas de personal.
BEGIN;
ALTER TABLE customers DROP CONSTRAINT customer_role;
ALTER TABLE customers ADD CONSTRAINT customer_role CHECK (role = 'customer');
COMMIT;
