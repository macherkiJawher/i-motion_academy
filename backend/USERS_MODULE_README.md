# Users module (summary)

Fichiers créés:

- `backend/src/users/entities/user.entity.ts` — TypeORM `User` entity and `Role` enum.
- `backend/src/users/dto/create-user.dto.ts` — `CreateUserDto` (validation via `class-validator`).
- `backend/src/users/dto/update-user.dto.ts` — `UpdateUserDto` (optional fields + validation).
- `backend/src/users/users.service.ts` — service with CRUD operations and errors.
- `backend/src/users/users.controller.ts` — controller exposing REST endpoints.
- `backend/src/users/users.module.ts` — NestJS module registering TypeORM repository.
- `backend/migrations/0001_create_users.sql` — SQL migration to create `users` table.
- `backend/migrations/seeds/001_users_seed.sql` — seed SQL with demo users.

Endpoints (HTTP):

- `GET /users` — list users (returns array).
- `GET /users/:id` — get single user by id.
- `POST /users` — create user (body `CreateUserDto`).
- `PATCH /users/:id` — update user (body `UpdateUserDto`).
- `DELETE /users/:id` — delete user.

Structure PostgreSQL (`users` table):

Columns:
- `id` UUID PK
- `first_name` varchar(100) NOT NULL
- `last_name` varchar(100) NOT NULL
- `email` varchar(200) NOT NULL UNIQUE
- `password` varchar(255) NULL
- `phone` varchar(40) NULL
- `role` varchar(32) NOT NULL DEFAULT 'PARTICIPANT'
- `created_at` timestamptz NOT NULL DEFAULT now()
- `avatar_url` varchar(1024) NULL

Notes / décisions à valider:

- Le module crée un champ `password` nullable. Le hachage et la logique d'authentification seront implémentés dans le module `auth` (prochaine étape).
- Les relations vers `Registration`, `Payment`, `Certificate`, `AppNotification` et `Trainer` sont documentées dans `user.entity.ts` mais **non** matérialisées par des décorateurs TypeORM dans cette itération (ils seront ajoutés lorsque ces modules existeront). Cela évite les imports circulaires et les erreurs de compilation tant que les autres entités n'existent pas.
- La migration SQL utilise `gen_random_uuid()` pour l'identifiant. En Postgres, activez l'extension `pgcrypto` ou adaptez la migration si vous préférez `uuid-ossp`.

Comment tester localement:

1. Installer les dépendances backend (si vous ne l'avez pas déjà fait):

```bash
cd "d:/stage ete 2026/i motion/backend"
npm install
```

2. Configurer la base de données PostgreSQL et exécuter la migration SQL (exemple):

```bash
# créer la base et activer l'extension pgcrypto
psql -U postgres -c "CREATE DATABASE imotion_dev;"
psql -d imotion_dev -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# exécuter la migration
psql -d imotion_dev -f migrations/0001_create_users.sql

# exécuter le seed
psql -d imotion_dev -f migrations/seeds/001_users_seed.sql
```

3. Démarrer le serveur Nest (assurez-vous d'avoir TypeORM configuré; le projet est scaffold, vous devrez ajouter `@nestjs/typeorm` + config dans `app.module.ts` si non présent):

```bash
npm run start:dev
```

4. Tester via Swagger ou Postman (Swagger peut être activé dans `main.ts` si souhaité) — endpoints listés ci-dessus.

Prochaines étapes proposées:

- Intégrer `@nestjs/typeorm` dans `app.module.ts` et ajouter la configuration de connexion (DATABASE_URL ou objet config).
- Ajouter `AuthModule` (hashing, JWT) qui utilisera `UsersService.create` pour le `register` et `findByEmail` pour `login`.
- Remplacer `password` stocké en clair par un hash lors de la création (bcrypt) — à faire dans `AuthService`.
- Ajouter relations TypeORM lorsque les modules `registrations`, `payments`, `certificates`, `notifications`, `trainers` seront implémentés.

Si tu veux que je génère le bootstrap TypeORM (`app.module.ts` config) et j'installe les dépendances (`@nestjs/typeorm`, `pg`, `class-validator`, `class-transformer`, etc.), dis-le moi et je prépare le patch suivant.
