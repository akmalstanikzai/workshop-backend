exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TYPE workshop_type AS ENUM ('telecom', 'power');
    CREATE TYPE job_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
    CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid');
    CREATE TYPE repair_progress AS ENUM ('received', 'diagnosing', 'repairing', 'ready', 'handed_over');
    CREATE TYPE payment_source AS ENUM ('customer', 'part_sale');

    CREATE SEQUENCE workshop_job_number_seq;
    CREATE SEQUENCE part_code_seq;
    CREATE SEQUENCE part_serial_seq;
    CREATE SEQUENCE customer_code_seq;

    CREATE VIEW profiles AS
      SELECT id, email::text, name::text AS full_name, role::text, created_at FROM users;

    CREATE TABLE workshop_jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_number text NOT NULL UNIQUE DEFAULT ('JOB-' || lpad(nextval('workshop_job_number_seq')::text, 5, '0')),
      customer_name text NOT NULL,
      phone text,
      equipment text NOT NULL,
      service_type workshop_type NOT NULL,
      issue text NOT NULL,
      status job_status NOT NULL DEFAULT 'pending',
      estimated_cost numeric NOT NULL DEFAULT 0 CHECK (estimated_cost >= 0),
      payment_status payment_status NOT NULL DEFAULT 'unpaid',
      paid_at timestamptz,
      paid_by integer REFERENCES users(id),
      created_by integer NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE parts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE DEFAULT ('PART-' || lpad(nextval('part_code_seq')::text, 5, '0')),
      name text NOT NULL,
      serial_number text NOT NULL UNIQUE DEFAULT ('PSN-' || lpad(nextval('part_serial_seq')::text, 7, '0')),
      quantity integer NOT NULL CHECK (quantity >= 0),
      unit_price numeric NOT NULL CHECK (unit_price >= 0),
      total_price numeric GENERATED ALWAYS AS (quantity::numeric * unit_price) STORED,
      purchase_date date NOT NULL,
      sale_price numeric NOT NULL CHECK (sale_price >= 0),
      created_by integer NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE customers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE DEFAULT ('CUS-' || lpad(nextval('customer_code_seq')::text, 5, '0')),
      serial_number text UNIQUE,
      name text NOT NULL,
      mobile_number text NOT NULL,
      company_name text,
      received_item text NOT NULL,
      received_date date NOT NULL,
      repairing_price numeric NOT NULL DEFAULT 0 CHECK (repairing_price >= 0),
      repairing_date date,
      handover_date date,
      quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
      total_price numeric NOT NULL DEFAULT 0 CHECK (total_price >= 0),
      payment_status payment_status NOT NULL DEFAULT 'unpaid',
      amount_paid numeric NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
      paid_date date,
      assigned_engineer_id integer REFERENCES users(id),
      progress repair_progress NOT NULL DEFAULT 'received',
      created_by integer NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE customer_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      serial_number text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE customer_parts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      part_id uuid NOT NULL REFERENCES parts(id),
      quantity integer NOT NULL CHECK (quantity > 0),
      unit_price numeric NOT NULL CHECK (unit_price >= 0),
      total_price numeric GENERATED ALWAYS AS (quantity::numeric * unit_price) STORED,
      added_by integer NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE part_sales (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      part_id uuid NOT NULL REFERENCES parts(id),
      quantity integer NOT NULL CHECK (quantity > 0),
      unit_price numeric NOT NULL CHECK (unit_price >= 0),
      total_price numeric GENERATED ALWAYS AS (quantity::numeric * unit_price) STORED,
      sold_by integer NOT NULL REFERENCES users(id),
      sold_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      source payment_source NOT NULL,
      customer_id uuid REFERENCES customers(id),
      part_sale_id uuid REFERENCES part_sales(id),
      amount numeric NOT NULL CHECK (amount > 0),
      recorded_by integer REFERENCES users(id),
      paid_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT payments_one_source CHECK (num_nonnulls(customer_id, part_sale_id) = 1),
      CONSTRAINT payments_source_matches CHECK (
        (source = 'customer' AND customer_id IS NOT NULL) OR
        (source = 'part_sale' AND part_sale_id IS NOT NULL)
      )
    );

    CREATE INDEX workshop_jobs_status_idx ON workshop_jobs(status);
    CREATE INDEX workshop_jobs_created_at_idx ON workshop_jobs(created_at DESC);
    CREATE INDEX customers_progress_idx ON customers(progress);
    CREATE INDEX customers_engineer_idx ON customers(assigned_engineer_id);
    CREATE INDEX customer_items_customer_idx ON customer_items(customer_id);
    CREATE INDEX customer_parts_customer_idx ON customer_parts(customer_id);
    CREATE INDEX customer_parts_part_idx ON customer_parts(part_id);
    CREATE INDEX part_sales_part_idx ON part_sales(part_id);
    CREATE INDEX payments_customer_idx ON payments(customer_id);
    CREATE INDEX payments_part_sale_idx ON payments(part_sale_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP VIEW IF EXISTS profiles;
    DROP TABLE IF EXISTS payments, part_sales, customer_parts, customer_items, customers, parts, workshop_jobs CASCADE;
    DROP SEQUENCE IF EXISTS customer_code_seq, part_serial_seq, part_code_seq, workshop_job_number_seq;
    DROP TYPE IF EXISTS payment_source, repair_progress, payment_status, job_status, workshop_type;
  `);
};
