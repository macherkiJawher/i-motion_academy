-- Seed: minimal users for local/dev testing
INSERT INTO "users" (id, first_name, last_name, email, password, phone, role, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001','Amine','Bouzid','amine.bouzid@example.com',NULL,'+216 22 448 190','PARTICIPANT',now()),
  ('00000000-0000-0000-0000-000000000003','Yasmine','Riahi','admin@i-motion.academy',NULL,'+216 20 114 200','ADMIN',now())
ON CONFLICT DO NOTHING;
