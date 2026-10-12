# Backend i-Motion Academy

Ce document décrit le backend tel qu’il est implémenté dans le code de ce dépôt. Il vise à servir de base documentaire pour une IA de génération de frontend, sans ajouter de fonctionnalités non présentes dans le code.

> Principe de documentation : si une information n’apparaît pas explicitement dans le backend, elle est signalée comme “Non défini dans le backend”.

## 1. Objectif du backend

Le backend est une API NestJS dédiée à la gestion d’une académie de formation et des parcours d’inscription associés. Le code expose des modules pour :

- l’authentification des utilisateurs ;
- la gestion des comptes et des rôles ;
- la gestion des formations ;
- la gestion des sessions de formation ;
- l’inscription des participants ;
- le suivi des paiements ;
- l’émission et la vérification de certificats ;
- les notifications ;
- l’audit et l’analyse ;
- les retours et réclamations.

Le projet est construit sur NestJS + TypeORM + PostgreSQL, avec validation DTO et support Swagger/OpenAPI.

## 2. Stack technique

### Framework et runtime

- NestJS 11
- TypeScript
- Node.js
- PostgreSQL

### Bibliothèques clés

- @nestjs/typeorm
- typeorm
- @nestjs/config
- @nestjs/jwt
- @nestjs/passport
- passport-jwt
- class-validator
- class-transformer
- bcryptjs
- pdfkit
- qrcode
- nodemailer
- @nestjs/swagger

### Scripts disponibles

```bash
npm install
npm run build
npm run start
npm run start:dev
npm run start:prod
npm run test
npm run test:e2e
npm run test:cov
npm run lint
```

## 3. Architecture générale

Le module racine est `AppModule`. Il charge les variables d’environnement globales et configure la connexion PostgreSQL via `TypeOrmModule.forRootAsync`.

### Modules chargés dans l’application

- UsersModule
- AuthModule
- TrainingsModule
- SessionsModule
- RegistrationsModule
- PaymentsModule
- CertificatesModule
- NotificationsModule
- AnalyticsModule
- AuditModule
- FeedbackModule
- ComplaintsModule

### Configuration de la base

Le backend exige les variables suivantes :

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=replace-with-your-postgres-password
DB_NAME=imotion_dev

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
MAIL_FROM="i-Motion Academy <no-reply@i-motion.academy>"
PUBLIC_APP_URL=http://localhost:8080
```

Le backend refuse de démarrer si les variables DB_* sont manquantes.

### Mot de passe oublié

Appliquer la migration qui ajoute les champs de jeton à usage unique et la
version de révocation des JWT avant de déployer le nouveau backend :

```sh
node run-migration.js 0025_add_password_reset_security.sql
```

Les mots de passe historiques enregistrés en clair par l’ancienne route admin
sont convertis en hash bcrypt lors de leur première connexion réussie. Les
comptes concernés qui ne peuvent pas se connecter doivent utiliser la
réinitialisation de mot de passe.

## 4. Authentification et autorisation

### Rôles utilisateur

Le système expose uniquement deux rôles :

```ts
export enum Role {
  PARTICIPANT = 'PARTICIPANT',
  ADMIN = 'ADMIN',
}
```

### Flux d’authentification

Les endpoints de base sont :

- POST /auth/register
- POST /auth/login
- GET /auth/me

La logique est dans `AuthService` :

- hashage du mot de passe avec bcryptjs ;
- validation du login via email + mot de passe ;
- génération d’un JWT ;
- retour du user sans mot de passe dans les réponses.

### Gardes de sécurité

- JwtAuthGuard protège les endpoints JWT.
- RolesGuard vérifie un rôle requis via @Roles(...).
- Les routes admin utilisent souvent `@UseGuards(AuthGuard('jwt'), RolesGuard)`.

### Payload JWT

Le token contient :

- sub : user id
- email : email utilisateur
- role : rôle utilisateur

## 5. Modèle utilisateur

### Entité User

Champs principaux :

- id
- firstName
- lastName
- email (unique)
- password (nullable, hashé côté auth)
- phone
- role
- avatarUrl
- createdAt

### Endpoints users

- GET /users : liste users (admin)
- GET /users/:id : détail user (admin)
- POST /users : création user (admin)
- PATCH /users/:id : modification user (admin)
- DELETE /users/:id : suppression user (admin)

### Point important

Le UsersController est protégé par JwtAuthGuard et RolesGuard, avec les routes exposées selon le rôle administrateur. Le AuthController expose le registre/login public.

## 6. Gestion des formations

### Entité Training

La formation est le cœur du catalogue. Les champs majeurs :

- id
- slug (unique)
- title
- axisCode
- subcategory
- recognitionType
- approvalStatus
- approvalReference
- approvalAuthority
- approvalValidUntil
- tagline
- description
- level
- durationHours
- price
- currency (par défaut EUR dans le code)
- certification
- targetAudience
- prerequisites
- skills
- program
- coverUrl
- rating
- learners
- active
- createdAt, updatedAt

### Enumérations de catégories de formation

```ts
export enum AxisCode {
  EMS = 'EMS',
  LANGUAGES = 'LANGUAGES',
  MANAGEMENT = 'MANAGEMENT',
  AI = 'AI',
  SPORT_COACHING = 'SPORT_COACHING',
  WELLNESS = 'WELLNESS',
  BTP = 'BTP',
  BTS = 'BTS',
}
```

### Types de reconnaissance

```ts
export enum RecognitionType {
  NONE = 'NONE',
  I_MOTION_CERTIFICATE = 'I_MOTION_CERTIFICATE',
  BTP_DIPLOMA = 'BTP_DIPLOMA',
  BTS_DIPLOMA = 'BTS_DIPLOMA',
}
```

### Règles métier des formations

Dans TrainingsService, le backend applique des règles strictes :

- les slugs sont auto-générés à partir du titre ;
- la formation est unique par title ou slug ;
- si recognitionType est BTP_DIPLOMA, alors axisCode doit être BTP ;
- si recognitionType est BTS_DIPLOMA, alors axisCode doit être BTS ;
- les statuts d’approbation ne sont autorisés que pour les diplômes BTP/BTS ;
- un diplôme approuvé exige approvalReference, approvalAuthority et approvalValidUntil.

### Endpoints trainings

- GET /trainings : liste publique des formations
- GET /trainings/:idOrSlug : détail d’une formation par UUID ou slug
- POST /trainings : création (admin)
- PATCH /trainings/:idOrSlug : mise à jour (admin)
- DELETE /trainings/:idOrSlug : suppression (admin)

## 7. Gestion des sessions

### Entité Session

Les sessions sont rattachées à une formation via trainingId et relation training.

Champs principaux :

- id
- trainingId
- trainerId (nullable)
- trainerName
- locationId (nullable)
- locationName
- city
- address
- latitude, longitude
- mode
- startDate, endDate
- startTime, endTime
- capacity
- seatsTaken
- status
- price
- currency
- certification

### Modes de session

```ts
export enum SessionMode {
  ON_SITE = 'On-site',
  HYBRID = 'Hybrid',
  LIVE_ONLINE = 'Live online',
}
```

### Statuts de session

```ts
export enum SessionStatus {
  OPEN = 'OPEN',
  ALMOST_FULL = 'ALMOST_FULL',
  FULL = 'FULL',
  CLOSED = 'CLOSED',
}
```

### Règles métier

- seatsTaken ne peut pas dépasser capacity ;
- le statut est calculé automatiquement en fonction de la capacité et des places occupées ;
- une session ne peut pas être créée pour une formation inactive ;
- la réponse API exposée est un objet enrichi avec trainingSlug, trainingTitle, seatsLeft, etc.

### Endpoints sessions

- GET /sessions : liste globale des sessions
- GET /sessions/:id : détail d’une session
- POST /sessions : création (admin)
- PATCH /sessions/:id : mise à jour (admin)
- DELETE /sessions/:id : suppression (admin)

## 8. Inscriptions et parcours participant

### Entité Registration

Un participant peut s’inscrire à une session. La table contient des informations de profil et de dossier administratif.

Champs principaux :

- id
- reference (unique, format IMA-YYYY-NNNN)
- userId (nullable)
- participantName
- participantEmail
- phone
- birthDate
- address, city, country
- educationLevel
- workExperience
- employmentStatus
- identityDocument
- qualificationDocument
- motivation
- referralSource
- notes
- sessionId
- status
- paymentStatus
- amountDue, amountPaid
- currency
- certificateId
- completedAt

### Statuts d’inscription

```ts
export enum RegistrationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}
```

### Statuts de paiement associés

```ts
export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  FAILED = 'FAILED',
}
```

### Règles métier importantes

- une session ne peut pas accueillir plus d’inscrits que sa capacité ;
- une inscription doublon est interdite pour une même session et le même email tant que la précédente n’est pas annulée ;
- le statut passe automatiquement en CONFIRMED lorsque le paiement est PAID et que l’inscription est en PENDING ;
- une annulation de session réduit le seatsTaken ;
- le backend construit également une timeline de progression métier côté API.

### Endpoints registrations

- GET /registrations : liste des inscriptions (admin)
- GET /registrations/me : inscriptions du participant connecté
- GET /registrations/session/:sessionId : inscriptions d’une session
- GET /registrations/:id : détail d’une inscription
- POST /registrations : création d’une inscription
- POST /registrations/:id/documents : upload de documents (identityDocument, qualificationDocument)
- GET /registrations/:id/documents/:kind : télécharge un document (admin)
- PATCH /registrations/:id : mise à jour (admin)
- DELETE /registrations/:id : suppression (admin)

### Gestion des documents uploadés

Les fichiers sont stockés dans :

- uploads/registrations/

Les types acceptés :

- PDF
- JPEG
- PNG
- Word (.doc, .docx)

La limite est de 2 fichiers maximum, taille max 10 Mo.

## 9. Paiements

### Entité Payment

Les paiements sont rattachés à une inscription et à un utilisateur optionnel.

Champs principaux :

- id
- reference (unique)
- registrationId
- userId
- amount
- currency
- method
- status
- paidAt
- createdAt

### Méthodes de paiement

```ts
export enum PaymentMethod {
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
}
```

### Règles métier

- un paiement ne peut pas dépasser le solde restant de l’inscription ;
- un paiement pour une inscription annulée est refusé ;
- si l’utilisateur n’est pas admin, il ne peut payer que pour son propre dossier ;
- le paiement déclenche l’application du montant à la registration via RegistrationsService.applyPayment().

### Endpoints payments

- GET /payments : liste des paiements (admin)
- GET /payments/me : paiements du participant connecté
- GET /payments/:id : détail d’un paiement
- POST /payments : création d’un paiement

## 10. Certificats

### Entité Certificate

Les certificats sont générés après une inscription terminée.

Champs principaux :

- id
- number (unique)
- userId
- registrationId
- type
- issuedAt
- completedAt
- status
- fileUrl
- revokedAt
- revocationReason

### Types et statuts

```ts
export enum CertificateType {
  CERTIFICATE = 'CERTIFICATE',
  DIPLOMA = 'DIPLOMA',
}

export enum CertificateStatus {
  ISSUED = 'ISSUED',
  ARCHIVED = 'ARCHIVED',
  REVOKED = 'REVOKED',
}
```

### Règles métier

- un certificat ne peut être délivré que si la registration est COMPLETED ;
- le backend génère un PDF et un QR code pour vérification ;
- le QR code pointe vers : PUBLIC_API_URL ou http://localhost:3000/certificates/verify/:number ;
- le téléchargement est restreint au propriétaire ou à un admin ;
- un certificat révoqué demande une raison.

### Endpoints certificates

- GET /certificates : liste des certificats (admin)
- GET /certificates/me : certificats du participant connecté
- GET /certificates/verify/:number : vérification publique
- GET /certificates/:id/download : téléchargement PDF
- GET /certificates/:id : détail certificat
- POST /certificates : création (admin)
- PATCH /certificates/:id : mise à jour de statut (admin)

### Stockage PDF

Les certificats sont générés dans :

- uploads/certificates/

## 11. Notifications

### Entité Notification

- id
- userId
- type
- title
- message
- read
- link
- createdAt

### Types de notification

```ts
export enum NotificationType {
  REGISTRATION_RECEIVED = 'REGISTRATION_RECEIVED',
  REGISTRATION_CONFIRMED = 'REGISTRATION_CONFIRMED',
  PAYMENT = 'PAYMENT',
  SESSION_REMINDER = 'SESSION_REMINDER',
  CERTIFICATE_AVAILABLE = 'CERTIFICATE_AVAILABLE',
  SYSTEM = 'SYSTEM',
}
```

### Endpoints notifications

- GET /notifications : liste des notifications (admin)
- GET /notifications/me : notifications du user connecté
- PATCH /notifications/read-all : marque toutes les notifications lues
- PATCH /notifications/:id/read : marque une notification lue

### Comportement

La création d’une notification envoie aussi un email via EmailService, ce qui indique un mécanisme d’emailing réel dans le backend.

## 12. Analytics et audit

### AnalyticsController

- GET /analytics : retour d’un aperçu admin de métriques de l’application

Le contenu exact dépend du service AnalyticsService, mais le contrôleur expose une route protégée par JWT.

### AuditController

- GET /admin/audit-logs
- GET /admin/audit-logs/export

Les filtres supportés :

- action
- entity
- status
- actorRole
- startDate
- endDate
- limit
- offset

### AuditLog et AuditService

Le backend conserve un journal d’actions avec :

- action
- entité
- actorId
- entityId
- détails
- statut
- IP et user-agent optionnels

Le service facture également :

- liste paginée ;
- résumé de session utilisateur ;
- export CSV ;
- détection de navigateur et device à partir du user-agent.

## 13. Feedback utilisateur

### Endpoints publics

- GET /feedback/public/training/:trainingSlug
- GET /feedback/public/training/:trainingSlug/summary
- GET /feedback/public/testimonials

### Endpoints protégés

- POST /feedback
- GET /feedback/:registrationId
- GET /feedback/:registrationId/available
- PATCH /feedback/:feedbackId
- POST /feedback/check-bad-words
- GET /feedback/session/:sessionId/stats
- GET /feedback/training/:trainingId/stats
- GET /feedback/trainer/:trainerId/stats

### Fonctionnalités observées

- stockage de notes/résultats de feedback ;
- modération anti-mots inappropriés via BadWordsService ;
- publication/changement d’approval ;
- contenu public de témoignages ;
- statistiques de feedback publique / par session / par formation / par formateur.

### Admin feedback

- GET /admin/feedback
- GET /admin/feedback/queue
- PATCH /admin/feedback/:feedbackId/publish
- PATCH /admin/feedback/:feedbackId/star
- DELETE /admin/feedback/:feedbackId
- GET /admin/feedback/featured
- GET /admin/feedback/stats/dashboard

## 14. Réclamations (complaints)

### Entité Complaint

La réclamation est structurée autour d’un sujet, d’une catégorie, d’un statut, d’une priorité, d’un affectation et d’objets liés.

### Catégories prises en charge

```ts
export enum ComplaintCategory {
  REGISTRATION = 'REGISTRATION',
  PAYMENT = 'PAYMENT',
  SESSION = 'SESSION',
  TRAINING = 'TRAINING',
  CERTIFICATE = 'CERTIFICATE',
  TRAINER = 'TRAINER',
  OTHER = 'OTHER',
}
```

### Statuts

```ts
export enum ComplaintStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_PARTICIPANT = 'WAITING_FOR_PARTICIPANT',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
}
```

### Endpoints participants

- POST /complaints
- GET /complaints/me
- GET /complaints/:id
- POST /complaints/:id/messages
- POST /complaints/:id/attachments

### Endpoints admin

- GET /admin/complaints
- GET /admin/complaints/metrics
- PATCH /admin/complaints/:id/take
- PATCH /admin/complaints/:id

### Fonctionnalités observées

- création de dossiers liés à inscription / paiement / certificat / session / formation ;
- messages internes ou participants ;
- pièces jointes PDF/JPEG/PNG ;
- affectation à un admin ;
- calcul de métriques de traitement.

## 15. Sécurité et validation

### Validation globale

Le main.ts active :

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

Cela permet de valider les payloads entrants et de retirer automatiquement les propriétés non déclarées dans les DTO.

### Swagger

Le backend expose une documentation OpenAPI via :

- /api/docs
- /api/docs-static

Le démarrage tente d’activer Swagger ; si l’intégration échoue, l’API reste utilisable.

## 16. Règles métier observées dans le code

Les éléments ci-dessous sont bien présents dans le backend et doivent être considérés comme des contraintes fonctionnelles actuelles :

- les rôles sont limités à PARTICIPANT et ADMIN ;
- les formations sont identifiées par UUID ou slug ;
- les sessions dépendent d’une formation active ;
- les inscriptions sont limitées par capacity ;
- les paiements ne peuvent pas dépasser le montant restant ;
- les certificats ne sont générés qu’après une inscription complétée ;
- les feedbacks peuvent être filtrés et moderés ;
- les réclamations sont attachées à des objets métier spécifiques ;
- les événements importants sont journalisés dans l’audit.

## 17. Points non définis dans le backend

Les informations suivantes ne sont pas présentes explicitement dans le code et doivent être considérées comme non définies dans le backend :

- politique commerciale détaillée ;
- segmentation de clientèle avancée ;
- marketplace ou paiement externe spécifique ;
- logique de CRM ou ERP intégrée ;
- abonnement ou plan de tarification multi-niveaux ;
- intégration réelle avec une plateforme de cours en ligne ;
- système de chat en direct ;
- SSO OAuth externes ;
- multi-tenant / multi-structure ;
- règles de coupons, discounts ou promo codes spécifiques ;
- rôles autres que PARTICIPANT et ADMIN.

## 18. Structure du dépôt

```text
backend/
  src/
    app.module.ts
    main.ts
    auth/
    users/
    trainings/
    sessions/
    registrations/
    payments/
    certificates/
    notifications/
    analytics/
    audit/
    feedback/
    complaints/
  migrations/
  seeds/
  uploads/
  swagger/
  test/
```

Le cycle de vie d’une session est distinct de son état d’inscription : `lifecycle_status` utilise `DRAFT`, `SCHEDULED`, `CANCELLED` ou `COMPLETED`, tandis que `status` indique l’ouverture et le remplissage.

## 19. Recommandation pour le frontend

Le frontend consommateur devra tenir compte des règles suivantes :

- gérer séparément le statut d’inscription (OPEN, ALMOST_FULL, FULL calculés, ou CLOSED manuellement) et le cycle de vie (DRAFT, SCHEDULED, CANCELLED, COMPLETED) ;
- gérer les statuts d’inscription (PENDING, CONFIRMED, CANCELLED, COMPLETED) ;
- attendre une authentification JWT pour les zones admin et certaines zones participant ;
- utiliser les routes de fichiers uploadés stockés sous uploads/... ;
- prévoir un affichage d’erreurs conforme aux exceptions NestJS (NotFoundException, ConflictException, ForbiddenException, etc.) ;
- s’appuyer sur les endpoints publics vs protégés selon les cas d’usage.

## 19.1. Migrations de sessions et capacité

Après la migration `0021_create_trainers_locations_and_session_assignments.sql`, exécuter dans l’ordre :

```powershell
npm run db:migrate:session-capacity
npm run db:migrate:session-lifecycle
npm run db:migrate:session-delivery-details
```

La migration de capacité aligne `seats_taken` sur les inscriptions non annulées et ajoute une contrainte d’horaires. Elle s’arrête si une session comporte plus d’inscriptions actives que sa capacité : ces données doivent être réconciliées avant de relancer la migration. Les changements d’inscription et du compteur sont ensuite enregistrés dans une transaction avec verrouillage de la session. La migration du cycle de vie ajoute les états brouillon/planifiée/annulée/terminée ; seules les sessions planifiées sont publiques et acceptent les inscriptions.

Le lien de visioconférence est réservé aux réponses d’administration ; les réponses publiques ne l’exposent pas. L’académie le communique après confirmation de l’inscription.

## 19.2. Heures pédagogiques facultatives en préparation

Les heures pédagogiques totales et les heures par module peuvent rester non renseignées pendant la préparation d’une formation. La migration `0026_allow_undefined_training_hours.sql` autorise une valeur `NULL` pour le total. Exécuter la migration depuis `backend` avec :

```powershell
npm run db:migrate:training-hours-optional
```

Les heures totales et les heures des modules sont facultatives, même après publication. Si le total et toutes les heures des modules sont indiqués, leur somme doit correspondre au total.

## 20. Conclusion

Le backend présente une architecture modulaire cohérente pour un système de formation orienté inscription, paiement, certification et support. Il est fonctionnellement riche et clairement centré sur :

- gestion du catalogue de formations ;
- planification de sessions ;
- suivi des inscriptions ;
- paiement et certificat ;
- support utilisateur et audit.

La version actuelle ne contient pas de preuve d’un module d’e-commerce complet, d’un LMS avancé ou d’une stratégie marketing backend centralisée. Les fonctionnalités réellement présentes sont celles exposées dans le code source ci-dessus.