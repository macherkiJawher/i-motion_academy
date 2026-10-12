CREATE TYPE contact_request_status AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');

CREATE TABLE contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name varchar(80) NOT NULL,
  last_name varchar(80) NOT NULL,
  email varchar(160) NOT NULL,
  phone varchar(30),
  subject varchar(140) NOT NULL,
  message varchar(1000) NOT NULL,
  status contact_request_status NOT NULL DEFAULT 'NEW',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_requests_created_at
  ON contact_requests (created_at DESC);
