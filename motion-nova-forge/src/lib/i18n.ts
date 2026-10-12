import { useEffect } from "react";

/**
 * Site-wide phrase dictionary.
 * Keys are the exact English source strings rendered in the UI.
 * The runtime translator (see useA11y) swaps text nodes and common
 * attributes (aria-label, placeholder, title) whenever the language changes.
 */

export type PhraseMap = Record<string, string>;

const fr: PhraseMap = {
  /* navigation & global */
  Home: "Accueil",
  About: "À propos",
  Trainings: "Formations",
  Sessions: "Sessions",
  Contact: "Contact",
  "Log in": "Connexion",
  "Sign in": "Se connecter",
  "Join the academy": "Rejoindre l'académie",
  "My account": "Mon compte",
  Account: "Mon compte",
  Dashboard: "Tableau de bord",
  Admin: "Administration",
  Participant: "Participant",
  Academy: "Académie",
  Spaces: "Espaces",
  Main: "Principal",
  Legal: "Mentions légales",
  "Open menu": "Ouvrir le menu",
  "Open AI assistant": "Ouvrir l'assistant IA",
  "i-Motion Assistant": "Assistant i-Motion",
  "Your guide to the academy": "Votre guide de l'académie",
  "Close assistant": "Fermer l'assistant",
  "Ask about trainings, sessions, or the academy...":
    "Posez une question sur les formations, les sessions ou l'académie...",
  "Cancel response": "Annuler la réponse",
  "Thinking...": "Réflexion en cours...",
  "Suggested questions": "Questions suggérées",
  References: "Références",
  "Ask a follow-up question": "Poser une question complémentaire",
  Assistant: "Assistant",
  You: "Vous",
  "No messages yet. Ask about trainings or sessions.":
    "Aucun message pour le moment. Posez une question sur les formations ou les sessions.",
  "Conversation is not saved.": "La conversation n'est pas enregistrée.",
  "Please add a little more detail so I can guide you.":
    "Ajoutez quelques précisions pour que je puisse vous guider.",
  "Contact us": "Nous contacter",
  Retry: "Réessayer",
  "Assistant service is unavailable.": "Le service de l'assistant est indisponible.",
  "Check your message and try again.": "Vérifiez votre message puis réessayez.",
  "This request is too large. Shorten it and try again.":
    "Cette demande est trop volumineuse. Réduisez son contenu puis réessayez.",
  "Too many requests. Please wait and try again.":
    "Trop de demandes. Veuillez patienter puis réessayer.",
  "The response took too long. Please try again.":
    "La réponse a pris trop de temps. Veuillez réessayer.",
  "The response was cancelled.": "La réponse a été annulée.",
  "The assistant is temporarily unavailable. Please try again.":
    "L'assistant est temporairement indisponible. Veuillez réessayer.",
  "The response could not be validated. Please try again.":
    "La réponse n'a pas pu être validée. Veuillez réessayer.",
  "Open accessibility options": "Ouvrir les options d'accessibilité",
  "i-Motion Academy home": "Accueil i-Motion Academy",
  "i-Motion Academy. All rights reserved.": "i-Motion Academy. Tous droits réservés.",
  "Academy desk": "Bureau de l'académie",
  "Come see the lab": "Venez voir le laboratoire",
  "Open days run monthly in Paris and Lyon. Bring questions, leave with a plan.":
    "Des journées portes ouvertes ont lieu chaque mois à Paris et Lyon. Venez avec vos questions, repartez avec un plan.",

  /* hero + home */
  "Become the": "Devenez le",
  "next EMS": "prochain",
  professional: "professionnel EMS",
  "Master EMS technology, coaching methodology and professional practice through immersive, hands-on training.":
    "Maîtrisez la technologie EMS, la méthodologie de coaching et la pratique professionnelle grâce à des formations immersives et pratiques.",
  "Explore EMS training": "Découvrir les formations EMS",
  "Explore training": "Découvrir les formations",
  "Talk to an advisor": "Parler à un conseiller",
  "Discover i-Motion": "Découvrir i-Motion",
  "See programs": "Voir les programmes",
  "Browse all programs": "Voir tous les programmes",
  "Full catalog": "Catalogue complet",
  "EMS Coach Pro · Cohort 2026 open": "EMS Coach Pro · Promotion 2026 ouverte",
  "Certified programs": "Programmes certifiants",
  "Certified alumni": "Diplômés certifiés",
  "Professionals certified": "Professionnels certifiés",
  "Partner studios": "Studios partenaires",
  "Countries covered": "Pays couverts",
  Countries: "Pays",
  "12 Countries": "12 pays",
  "Average cohort rating": "Note moyenne des promotions",
  "Employed within 6 months": "En poste sous 6 mois",
  "Client retention": "Fidélisation client",
  "20 min protocol": "Protocole de 20 min",
  "8 channels active": "8 canaux actifs",
  "Impulse 85 Hz": "Impulsion 85 Hz",
  "Since 2016": "Depuis 2016",
  "We don't teach courses. We certify EMS professionals who train real bodies.":
    "Nous ne donnons pas des cours. Nous certifions des professionnels EMS qui entraînent de vrais corps.",
  "EMS first. Certified for practice.": "L'EMS d'abord. Certifié pour la pratique.",
  "EMS first. Then everything around it.": "L'EMS d'abord. Puis tout ce qui l'entoure.",
  "Taught by practising EMS professionals.": "Enseigné par des professionnels EMS en exercice.",
  "Every strap is a skill.": "Chaque sangle est une compétence.",
  "Train the coach.": "Formez le coach.",
  "Not just the athlete.": "Pas seulement l'athlète.",
  "Not sure which training is right for you?": "Vous ne savez pas quelle formation vous convient ?",
  "Not sure which program fits?": "Vous hésitez sur le programme ?",
  "Step inside an": "Entrez dans une",
  "EMS session": "séance EMS",
  "Your entry into the impulse era.": "Votre entrée dans l'ère de l'impulsion.",
  "Electro-muscular stimulation, engineered to perfection.":
    "L'électrostimulation musculaire, conçue à la perfection.",
  "The suit, explained": "La combinaison, expliquée",
  "Hover the markers to see what you learn to control in the suit lab. Everything here is trained hands-on, on real equipment, with a real client in front of you.":
    "Survolez les repères pour voir ce que vous apprenez à maîtriser en laboratoire. Tout est travaillé en pratique, sur du vrai matériel, avec un vrai client devant vous.",
  "Electrode placement": "Placement des électrodes",
  "Electrode contact": "Contact des électrodes",
  "Chest & back channels": "Canaux poitrine & dos",
  "Cable routing": "Cheminement des câbles",
  "Intensity control": "Contrôle de l'intensité",
  "Impulse calibration": "Calibration de l'impulsion",
  "Suit calibration": "Calibration de la combinaison",
  "Movement under load": "Mouvement sous charge",
  "Safety screening": "Dépistage sécurité",
  "Channel mapping across the large muscle groups — the first calibration exercise of the suit lab.":
    "Cartographie des canaux sur les grands groupes musculaires — le premier exercice de calibration du laboratoire.",
  "Moistening, pad seating and strap tension. Poor contact is the number one cause of an uneven session.":
    "Humidification, positionnement des pads et tension des sangles. Un mauvais contact est la première cause d'une séance irrégulière.",
  "Clean routing keeps the client free to move and keeps the coach's hands on technique, not hardware.":
    "Un câblage propre laisse le client libre de bouger et garde les mains du coach sur la technique, pas sur le matériel.",
  "Per-channel intensity is set with the client, verbally checked and re-checked at every ramp.":
    "L'intensité de chaque canal est réglée avec le client, vérifiée verbalement et revérifiée à chaque palier.",
  "The club becomes the live laboratory: real clients, real feedback, real constraints.":
    "Le club devient le laboratoire vivant : vrais clients, vrais retours, vraies contraintes.",
  "The faculty": "L'équipe pédagogique",
  "The people in the lab": "Les femmes et les hommes du laboratoire",
  "Four training axes": "Quatre axes de formation",
  "Sport & EMS leads, joined by languages, commerce & management and artificial intelligence.":
    "Le sport & l'EMS en tête, complétés par les langues, le commerce & management et l'intelligence artificielle.",
  "The flagship axis. EMS technology, coaching methodology and certified practical training.":
    "L'axe phare. Technologie EMS, méthodologie de coaching et formation pratique certifiante.",
  Languages: "Langues",
  "Commerce & Management": "Commerce & Management",
  "Artificial Intelligence": "Intelligence artificielle",
  "Professional communication for coaches working with international clients.":
    "Communication professionnelle pour les coachs travaillant avec une clientèle internationale.",
  "Consultation, retention and building a client base.":
    "Consultation, fidélisation et construction d'une clientèle.",
  "Motion analytics and AI tooling applied to coaching decisions.":
    "Analyse du mouvement et outils IA appliqués aux décisions de coaching.",
  "The path": "Le parcours",
  "From curious to certified": "De la curiosité à la certification",
  "Step 01": "Étape 01",
  "Step 02": "Étape 02",
  "Step 03": "Étape 03",
  "Step 04": "Étape 04",
  Diagnose: "Diagnostic",
  Immerse: "Immersion",
  Prove: "Validation",
  Launch: "Lancement",
  "A 20-minute AI intake maps your background, goals and gaps.":
    "Un entretien IA de 20 minutes cartographie votre parcours, vos objectifs et vos lacunes.",
  "Live labs with real suits, real clients, real feedback loops.":
    "Des ateliers en direct avec de vraies combinaisons, de vrais clients, de vrais retours.",
  "Assessment on a live session, scored on protocol and safety.":
    "Évaluation sur une séance réelle, notée sur le protocole et la sécurité.",
  "Certification plugs you into a 340-studio hiring network across Europe.":
    "La certification vous connecte à un réseau de recrutement de 340 studios en Europe.",
  "Signals from the field": "Retours du terrain",
  "Your next level": "Votre prochain niveau",
  "starts now": "commence maintenant",
  "Seats in the 2026 cohorts are limited by lab capacity. Reserve your place and get the full curriculum pack.":
    "Les places des promotions 2026 sont limitées par la capacité du laboratoire. Réservez la vôtre et recevez le programme complet.",
  "Read movement like a machine does.": "Lisez le mouvement comme une machine.",
  "Turn data into human progress.": "Transformez la donnée en progrès humain.",
  "Pose estimation": "Estimation de posture",
  "Sensor fusion": "Fusion de capteurs",
  Reporting: "Reporting",
  "Movement Data": "Données de mouvement",
  "AI Motion": "AI Motion",
  "AI Motion Analytics": "Analyse IA du mouvement",

  /* about */
  "Our story": "Notre histoire",
  "How the academy grew": "Comment l'académie a grandi",
  "i-Motion started as a two-person lab obsessed with electro-muscular stimulation. Ten years later it is a full ecosystem: physiology, coaching craft, business systems and applied AI — taught by people who still work with clients every week.":
    "i-Motion a démarré comme un laboratoire de deux personnes obsédées par l'électrostimulation. Dix ans plus tard, c'est un écosystème complet : physiologie, art du coaching, systèmes business et IA appliquée — enseignés par des gens qui travaillent encore avec des clients chaque semaine.",
  "The first EMS suit": "La première combinaison EMS",
  "Two coaches, one suit and a rented room. Every protocol was written by hand after each session.":
    "Deux coachs, une combinaison et une salle louée. Chaque protocole était écrit à la main après la séance.",
  "i-Motion Club opens": "Ouverture du i-Motion Club",
  "From one suit to a full studio.": "D'une combinaison à un studio complet.",
  "Built for people who move.": "Conçu pour ceux qui bougent.",
  "What we refuse to compromise on": "Ce sur quoi nous ne transigeons pas",
  "Lab first": "Le laboratoire d'abord",
  "Every claim we teach is validated in our own physiology lab before it reaches a slide.":
    "Chaque affirmation enseignée est validée dans notre laboratoire de physiologie avant d'arriver sur une diapositive.",
  "Small cohorts": "Petites promotions",
  "Sixteen seats maximum per on-site lab. You touch the equipment, every hour.":
    "Seize places maximum par atelier sur site. Vous touchez le matériel, à chaque heure.",
  "Open data": "Données ouvertes",
  "Learners see their own assessment data, raw and unfiltered, forever.":
    "Les apprenants accèdent à leurs données d'évaluation, brutes et non filtrées, à vie.",
  "Career-linked": "Lié à l'emploi",
  "Certification, studio network access and business playbooks.":
    "Certification, accès au réseau de studios et méthodes business.",
  "Trainer ·": "Formateur ·",
  "Book a visit": "Réserver une visite",

  /* catalog & trainings */
  "Training catalog": "Catalogue de formations",
  "Six programs, one standard: everything is taught by practitioners and validated in our lab.":
    "Six programmes, un seul standard : tout est enseigné par des praticiens et validé dans notre laboratoire.",
  "AI advisor": "Conseiller IA",
  "AI assistant": "Assistant IA",
  "Answer three questions — our recommendation engine matches your profile, goal and experience level with the right certification path.":
    "Répondez à trois questions — notre moteur de recommandation associe votre profil, votre objectif et votre niveau au bon parcours certifiant.",
  "Answer three questions about your profile, your goal and your experience. ORBIT matches you with the i-Motion program that fits — and tells you what the certification actually covers.":
    "Répondez à trois questions sur votre profil, votre objectif et votre expérience. ORBIT vous oriente vers le programme i-Motion adapté — et vous dit ce que couvre réellement la certification.",
  "Question 1 of 3": "Question 1 sur 3",
  "Question 2 of 3": "Question 2 sur 3",
  "Question 3 of 3": "Question 3 sur 3",
  "What's your professional profile?": "Quel est votre profil professionnel ?",
  "New to the industry": "Nouveau dans le secteur",
  "Personal trainer / coach": "Coach sportif / entraîneur personnel",
  "Studio owner or manager": "Gérant ou responsable de studio",
  "Search programs": "Rechercher un programme",
  "Max price": "Prix max",
  "Maximum price": "Prix maximum",
  All: "Tous",
  Coaching: "Coaching",
  Nutrition: "Nutrition",
  Business: "Business",
  Tech: "Tech",
  Data: "Data",
  Recovery: "Récupération",
  Safety: "Sécurité",
  Precision: "Précision",
  Flagship: "Programme phare",
  "Quick view": "Aperçu rapide",
  Details: "Détails",
  Register: "S'inscrire",
  "Reserve my seat": "Réserver ma place",
  "Certification path": "Parcours certifiant",
  "Curriculum modules": "Modules du programme",
  "The EMS Coach Pro curriculum is formalised into six modules with supervised suit labs.":
    "Le programme EMS Coach Pro est structuré en six modules avec des ateliers encadrés en combinaison.",
  "EMS Physiology": "Physiologie EMS",
  "EMS Technology": "Technologie EMS",
  "EMS technology": "technologie EMS",
  "Impulse physiology": "Physiologie de l'impulsion",
  "Impulse parameters, suit architecture and machine handling.":
    "Paramètres d'impulsion, architecture de la combinaison et maniement de la machine.",
  "Safety & Contraindications": "Sécurité & contre-indications",
  "Screening, medical flags and how to stop a session correctly.":
    "Dépistage, signaux médicaux et arrêt correct d'une séance.",
  "Training Methodology": "Méthodologie d'entraînement",
  "Training methodology": "Méthodologie d'entraînement",
  Methodology: "Méthodologie",
  "Structuring the 20-minute session and progression over blocks.":
    "Structurer la séance de 20 minutes et la progression par blocs.",
  Periodization: "Périodisation",
  "Adapting protocols to profile, goal and tolerance.":
    "Adapter les protocoles au profil, à l'objectif et à la tolérance.",
  "Coaching & Client Acquisition": "Coaching & acquisition client",
  "Practical Labs": "Ateliers pratiques",
  "Practical Training": "Formation pratique",
  "Suit labs with clients": "Ateliers combinaison avec clients",
  "Supervised suit labs on real clients, scored on protocol.":
    "Ateliers encadrés en combinaison sur de vrais clients, notés sur le protocole.",
  "Personalized Sessions": "Séances personnalisées",
  "Performance Coaching": "Coaching de performance",
  "Performance Coaching Lab": "Laboratoire de coaching de performance",
  "Elite Coaching": "Coaching d'élite",
  "Applied Sports Nutrition": "Nutrition sportive appliquée",
  "Fuel strategy for high-output bodies.": "Stratégie nutritionnelle pour les corps à haut rendement.",
  "Studio Business Accelerator": "Accélérateur business de studio",
  "Studio operations, pricing and client acquisition for training professionals.":
    "Gestion de studio, tarification et acquisition client pour les professionnels de la formation.",
  "Professional English for Coaches": "Anglais professionnel pour coachs",
  "Professional coaching": "Coaching professionnel",
  "Coaching language": "Langue de coaching",
  "Coach certification": "Certification coach",
  "EMS Certified": "Certifié EMS",
  Certified: "Certifié",
  Format: "Format",
  Hybrid: "Hybride",
  "On-site": "Présentiel",
  Remote: "À distance",
  "Live online": "En ligne en direct",
  Live: "En direct",

  /* sessions */
  Calendar: "Calendrier",
  "Upcoming sessions": "Prochaines sessions",
  "Every cohort runs in person with a limited lab capacity. Pick a city, check the remaining seats and lock your place.":
    "Chaque promotion se déroule en présentiel avec une capacité limitée. Choisissez une ville, vérifiez les places restantes et réservez.",
  City: "Ville",
  Choose: "Choisir",
  Open: "Ouvert",
  Closed: "Fermé",
  Full: "Complet",
  "Almost full": "Presque complet",
  "seats left": "places restantes",
  dates: "dates",
  sessions: "sessions",
  days: "jours",

  /* contact */
  "Send a message": "Envoyer un message",
  "Send message": "Envoyer le message",
  "Group bookings, prerequisites, certificate verification — we answer within one business day.":
    "Réservations de groupe, prérequis, vérification de certificat — nous répondons sous un jour ouvré.",
  Subject: "Objet",
  Message: "Message",
  Send: "Envoyer",
  Ask: "Demander",
  "Ask about EMS certification…": "Posez une question sur la certification EMS…",
  "I'm ORBIT. Ask me about programs, prerequisites, prices or upcoming sessions.":
    "Je suis ORBIT. Posez-moi vos questions sur les programmes, prérequis, tarifs ou prochaines sessions.",
  "ORBIT · Academy guide": "ORBIT · Guide de l'académie",
  "A guided conversation to find the right certification path.":
    "Une conversation guidée pour trouver le bon parcours certifiant.",

  /* auth */
  "Welcome back": "Content de vous revoir",
  "Sign in to your academy space.": "Connectez-vous à votre espace académie.",
  "Continue with Google": "Continuer avec Google",
  Email: "E-mail",
  Password: "Mot de passe",
  "First name": "Prénom",
  "Last name": "Nom",
  Phone: "Téléphone",
  "Phone (optional)": "Téléphone (optionnel)",
  "Create account": "Créer un compte",
  "Create an account": "Créer un compte",
  "Create your participant account in under a minute.":
    "Créez votre compte participant en moins d'une minute.",
  "Already registered?": "Déjà inscrit ?",
  "Forgot password": "Mot de passe oublié",
  "Forgot password?": "Mot de passe oublié ?",
  "Send reset link": "Envoyer le lien de réinitialisation",
  "Back to sign in": "Retour à la connexion",
  "Demo accounts: participant@i-motion.academy · admin@i-motion.academy (any password).":
    "Comptes de démo : participant@i-motion.academy · admin@i-motion.academy (mot de passe libre).",

  /* dashboard & admin */
  "My Academy": "Mon académie",
  Overview: "Vue d'ensemble",
  "My registrations": "Mes inscriptions",
  Registrations: "Inscriptions",
  Payments: "Paiements",
  Certificates: "Certificats",
  "Certificates & diplomas": "Certificats & diplômes",
  Notifications: "Notifications",
  Profile: "Profil",
  Analytics: "Analytique",
  Administration: "Administration",
  "Participants & users": "Participants & utilisateurs",
  "Contact requests": "Demandes de contact",
  "Your registrations, payments and certificates in one place.":
    "Vos inscriptions, paiements et certificats au même endroit.",
  "Follow each file from submission to certificate.":
    "Suivez chaque dossier, du dépôt au certificat.",
  "Every transaction linked to your registrations.":
    "Chaque transaction liée à vos inscriptions.",
  "Numbered documents issued after each validated assessment.":
    "Documents numérotés délivrés après chaque évaluation validée.",
  "Reminders, payments and status changes.": "Rappels, paiements et changements de statut.",
  "Your account details.": "Les détails de votre compte.",
  "Academy-wide activity, revenue and operations at a glance.":
    "L'activité, les revenus et les opérations de l'académie en un coup d'œil.",
  "Deep dive into performance, revenue and demand signals.":
    "Analyse détaillée de la performance, des revenus et de la demande.",
  "You have full control over the catalog: create, edit and delete programs.":
    "Vous avez le contrôle total du catalogue : créer, modifier et supprimer les programmes.",
  "Plan dates, capacity and instructors. Administration has full control.":
    "Planifiez les dates, la capacité et les formateurs. L'administration a le contrôle total.",
  "Validate files, follow payments and completion.":
    "Validez les dossiers, suivez les paiements et les validations.",
  "All recorded transactions.": "Toutes les transactions enregistrées.",
  "Issued certificates and diplomas.": "Certificats et diplômes délivrés.",
  "Accounts across every role.": "Les comptes de tous les rôles.",
  "Messages sent from the public contact form.":
    "Messages envoyés depuis le formulaire de contact public.",
  "Latest registrations": "Dernières inscriptions",
  "Recent registrations": "Inscriptions récentes",
  "Registrations trend": "Évolution des inscriptions",
  "Registrations vs revenue": "Inscriptions vs revenus",
  "Registration status mix": "Répartition des statuts d'inscription",
  "Revenue by axis": "Revenus par axe",
  "Revenue balance by axis": "Équilibre des revenus par axe",
  "Payment method mix": "Répartition des moyens de paiement",
  "Session occupancy": "Taux de remplissage",
  "Live session occupancy": "Remplissage des sessions en cours",
  "Most demanded trainings": "Formations les plus demandées",
  "Training popularity": "Popularité des formations",
  "Next session": "Prochaine session",
  "No upcoming session": "Aucune session à venir",
  "No registration yet": "Aucune inscription pour le moment",
  "No payment recorded": "Aucun paiement enregistré",
  "No certificate yet": "Aucun certificat pour le moment",
  "No request": "Aucune demande",
  "Nothing new": "Rien de nouveau",
  "Audit logs": "Journaux d'audit",
  "Administrative actions and active user sessions across the platform.": "Actions administratives et sessions utilisateurs actives sur la plateforme.",
  "Admin actions": "Actions administratives",
  "Active sessions": "Sessions actives",
  "Risky sessions": "Sessions à risque",
  "Last sync": "Dernière synchronisation",
  Filters: "Filtres",
  "Search and filter admin actions": "Rechercher et filtrer les actions administratives",
  Status: "Statut",
  "All statuses": "Tous les statuts",
  Success: "Réussi",
  Warning: "Avertissement",
  Failed: "Échec",
  "Actor role": "Rôle de l'auteur",
  "All roles": "Tous les rôles",
  "Entity type": "Type d'entité",
  "All entities": "Toutes les entités",
  "From date": "Date de début",
  "To date": "Date de fin",
  "Export to CSV": "Exporter en CSV",
  "Recent privileged actions across the academy": "Dernières actions privilégiées dans l'académie",
  "No actions logged": "Aucune action enregistrée",
  "There are no admin actions recorded yet.": "Aucune action administrative n'est encore enregistrée.",
  "User sessions": "Sessions utilisateurs",
  "Connected users and their device context": "Utilisateurs connectés et contexte de leur appareil",
  "No active sessions": "Aucune session active",
  "There are no user sessions to display.": "Aucune session utilisateur à afficher.",
  User: "Utilisateur",
  Device: "Appareil",
  Location: "Emplacement",
  "Last seen": "Dernière activité",
  "Sport & Coaching": "Sport & coaching",
  "EMS · Pilates · Personal Training · Fitness · Functional Training · Physical Preparation":
    "EMS · Pilates · Coaching personnel · Fitness · Entraînement fonctionnel · Préparation physique",
  "Well-being": "Bien-être",
  "French · English · German · Italian · Spanish · Chinese": "Français · Anglais · Allemand · Italien · Espagnol · Chinois",
  "Explore our training programs": "Explorer nos formations",
  "BTP & BTS programs": "Parcours BTP & BTS",
  "IT, commerce, accounting, marketing, management and networks.": "Informatique, commerce, comptabilité, marketing, gestion et réseaux.",
  "BTP/BTS diplomas are shown as accredited only after official authorization. Other programs issue an i-Motion certificate.":
    "Les diplômes BTP/BTS sont indiqués comme homologués uniquement après habilitation officielle. Les autres parcours délivrent une certification i-Motion.",
  "My feedback": "Mes retours",
  "Share your feedback on your completed training programs": "Donnez votre avis sur vos formations complétées",
  "Completed sessions": "Sessions complétées",
  "No completed sessions yet": "Aucune session complétée pour le moment",
  "Sessions in progress": "Sessions en cours",
  "No trainer assigned": "Sans formateur",
  "✓ Completed": "✓ Complétée",
  Hide: "Masquer",
  "Give feedback": "Donner un avis",
  "Feedback will be available after the session ends": "Le feedback sera disponible après la fin de la session",
};

const ar: PhraseMap = {
  /* navigation & global */
  Home: "الرئيسية",
  About: "من نحن",
  Trainings: "التكوينات",
  Sessions: "الحصص",
  Contact: "اتصل بنا",
  "Log in": "تسجيل الدخول",
  "Sign in": "تسجيل الدخول",
  "Join the academy": "انضم إلى الأكاديمية",
  "My account": "حسابي",
  Account: "حسابي",
  Dashboard: "لوحة التحكم",
  Admin: "الإدارة",
  Participant: "مشارك",
  Academy: "الأكاديمية",
  Spaces: "المساحات",
  Main: "الرئيسي",
  Legal: "قانوني",
  "Open menu": "فتح القائمة",
  "Open AI assistant": "فتح المساعد الذكي",
  "i-Motion Assistant": "مساعد i-Motion",
  "Your guide to the academy": "دليلك إلى الأكاديمية",
  "Close assistant": "إغلاق المساعد",
  "Ask about trainings, sessions, or the academy...":
    "اسأل عن التكوينات أو الحصص أو الأكاديمية...",
  "Cancel response": "إلغاء الرد",
  "Thinking...": "جارٍ التفكير...",
  "Suggested questions": "أسئلة مقترحة",
  References: "المراجع",
  "Ask a follow-up question": "اطرح سؤالًا إضافيًا",
  Assistant: "المساعد",
  You: "أنت",
  "No messages yet. Ask about trainings or sessions.":
    "لا توجد رسائل بعد. اسأل عن التكوينات أو الحصص.",
  "Conversation is not saved.": "لا يتم حفظ المحادثة.",
  "Please add a little more detail so I can guide you.":
    "يرجى إضافة بعض التفاصيل لمساعدتك.",
  "Contact us": "اتصل بنا",
  Retry: "إعادة المحاولة",
  "Assistant service is unavailable.": "خدمة المساعد غير متاحة.",
  "Check your message and try again.": "تحقق من رسالتك ثم أعد المحاولة.",
  "This request is too large. Shorten it and try again.":
    "الطلب كبير جدًا. اختصره ثم أعد المحاولة.",
  "Too many requests. Please wait and try again.":
    "طلبات كثيرة جدًا. انتظر قليلًا ثم أعد المحاولة.",
  "The response took too long. Please try again.":
    "استغرق الرد وقتًا طويلًا. أعد المحاولة.",
  "The response was cancelled.": "تم إلغاء الرد.",
  "The assistant is temporarily unavailable. Please try again.":
    "المساعد غير متاح مؤقتًا. أعد المحاولة.",
  "The response could not be validated. Please try again.":
    "تعذر التحقق من الرد. أعد المحاولة.",
  "Open accessibility options": "فتح خيارات إمكانية الوصول",
  "i-Motion Academy home": "الصفحة الرئيسية لأكاديمية i-Motion",
  "i-Motion Academy. All rights reserved.": "أكاديمية i-Motion. جميع الحقوق محفوظة.",
  "Academy desk": "مكتب الأكاديمية",
  "Come see the lab": "تعال لزيارة المختبر",
  "Open days run monthly in Paris and Lyon. Bring questions, leave with a plan.":
    "أيام مفتوحة شهريًا في باريس وليون. احضر بأسئلتك واخرج بخطة واضحة.",

  /* hero + home */
  "Become the": "كن",
  "next EMS": "محترف",
  professional: "التحفيز الكهربائي القادم",
  "Master EMS technology, coaching methodology and professional practice through immersive, hands-on training.":
    "أتقن تقنية التحفيز الكهربائي العضلي ومنهجية التدريب والممارسة المهنية عبر تكوين عملي غامر.",
  "Explore EMS training": "استكشف تكوينات EMS",
  "Explore training": "استكشف التكوينات",
  "Talk to an advisor": "تحدث إلى مستشار",
  "Discover i-Motion": "اكتشف i-Motion",
  "See programs": "عرض البرامج",
  "Browse all programs": "تصفح كل البرامج",
  "Full catalog": "الكتالوج الكامل",
  "EMS Coach Pro · Cohort 2026 open": "EMS Coach Pro · دفعة 2026 مفتوحة",
  "Certified programs": "برامج معتمدة",
  "Certified alumni": "خريجون معتمدون",
  "Professionals certified": "محترفون معتمدون",
  "Partner studios": "استوديوهات شريكة",
  "Countries covered": "دول مغطاة",
  Countries: "دول",
  "12 Countries": "12 دولة",
  "Average cohort rating": "متوسط تقييم الدفعات",
  "Employed within 6 months": "توظيف خلال 6 أشهر",
  "Client retention": "الاحتفاظ بالعملاء",
  "20 min protocol": "بروتوكول 20 دقيقة",
  "8 channels active": "8 قنوات نشطة",
  "Impulse 85 Hz": "نبضة 85 هرتز",
  "Since 2016": "منذ 2016",
  "We don't teach courses. We certify EMS professionals who train real bodies.":
    "نحن لا نقدّم دروسًا فحسب. نحن نعتمد محترفي EMS الذين يدرّبون أجسادًا حقيقية.",
  "EMS first. Certified for practice.": "الـEMS أولًا. معتمد للممارسة.",
  "EMS first. Then everything around it.": "الـEMS أولًا. ثم كل ما يحيط به.",
  "Taught by practising EMS professionals.": "يدرّسه محترفو EMS الممارسون.",
  "Every strap is a skill.": "كل حزام مهارة.",
  "Train the coach.": "درّب المدرّب.",
  "Not just the athlete.": "وليس الرياضي فقط.",
  "Not sure which training is right for you?": "لست متأكدًا أي تكوين يناسبك؟",
  "Not sure which program fits?": "لست متأكدًا أي برنامج يناسبك؟",
  "Step inside an": "ادخل إلى",
  "EMS session": "حصة EMS",
  "Your entry into the impulse era.": "بوابتك إلى عصر النبضة.",
  "Electro-muscular stimulation, engineered to perfection.":
    "التحفيز الكهربائي العضلي، مصمَّم بإتقان.",
  "The suit, explained": "شرح البدلة",
  "Hover the markers to see what you learn to control in the suit lab. Everything here is trained hands-on, on real equipment, with a real client in front of you.":
    "مرّر فوق العلامات لترى ما ستتعلم التحكم فيه داخل المختبر. كل شيء يُتدرَّب عليه عمليًا، بمعدات حقيقية وعميل حقيقي أمامك.",
  "Electrode placement": "وضع الأقطاب",
  "Electrode contact": "تلامس الأقطاب",
  "Chest & back channels": "قنوات الصدر والظهر",
  "Cable routing": "توجيه الكابلات",
  "Intensity control": "التحكم في الشدة",
  "Impulse calibration": "معايرة النبضة",
  "Suit calibration": "معايرة البدلة",
  "Movement under load": "الحركة تحت الحمل",
  "Safety screening": "فحص السلامة",
  "Channel mapping across the large muscle groups — the first calibration exercise of the suit lab.":
    "رسم خريطة القنوات على المجموعات العضلية الكبرى — أول تمرين معايرة في المختبر.",
  "Moistening, pad seating and strap tension. Poor contact is the number one cause of an uneven session.":
    "الترطيب وتثبيت الوسائد وشدّ الأحزمة. سوء التلامس هو السبب الأول لحصة غير متوازنة.",
  "Clean routing keeps the client free to move and keeps the coach's hands on technique, not hardware.":
    "التوجيه النظيف للكابلات يترك العميل حرًا في الحركة ويبقي يدي المدرّب على التقنية لا على المعدات.",
  "Per-channel intensity is set with the client, verbally checked and re-checked at every ramp.":
    "تُضبط شدة كل قناة مع العميل، وتُراجع شفويًا عند كل زيادة.",
  "The club becomes the live laboratory: real clients, real feedback, real constraints.":
    "يصبح النادي مختبرًا حيًا: عملاء حقيقيون، ملاحظات حقيقية، قيود حقيقية.",
  "The faculty": "هيئة التدريس",
  "The people in the lab": "أشخاص المختبر",
  "Four training axes": "أربعة محاور تكوين",
  "Sport & EMS": "الرياضة و EMS",
  "Sport & EMS leads, joined by languages, commerce & management and artificial intelligence.":
    "الرياضة وEMS في المقدمة، تليها اللغات والتجارة والإدارة والذكاء الاصطناعي.",
  "The flagship axis. EMS technology, coaching methodology and certified practical training.":
    "المحور الرئيسي. تقنية EMS ومنهجية التدريب والتكوين العملي المعتمد.",
  Languages: "اللغات",
  "Commerce & Management": "التجارة والإدارة",
  "Artificial Intelligence": "الذكاء الاصطناعي",
  "Professional communication for coaches working with international clients.":
    "تواصل مهني للمدربين الذين يعملون مع عملاء دوليين.",
  "Consultation, retention and building a client base.":
    "الاستشارة والاحتفاظ بالعملاء وبناء قاعدة زبائن.",
  "Motion analytics and AI tooling applied to coaching decisions.":
    "تحليل الحركة وأدوات الذكاء الاصطناعي في قرارات التدريب.",
  "The path": "المسار",
  "From curious to certified": "من الفضول إلى الاعتماد",
  "Step 01": "الخطوة 01",
  "Step 02": "الخطوة 02",
  "Step 03": "الخطوة 03",
  "Step 04": "الخطوة 04",
  Diagnose: "التشخيص",
  Immerse: "الانغماس",
  Prove: "الإثبات",
  Launch: "الانطلاق",
  "A 20-minute AI intake maps your background, goals and gaps.":
    "مقابلة ذكية من 20 دقيقة ترسم خلفيتك وأهدافك وفجواتك.",
  "Live labs with real suits, real clients, real feedback loops.":
    "مختبرات حية ببدلات حقيقية وعملاء حقيقيين وتغذية راجعة فورية.",
  "Assessment on a live session, scored on protocol and safety.":
    "تقييم في حصة حقيقية، يُحتسب على البروتوكول والسلامة.",
  "Certification plugs you into a 340-studio hiring network across Europe.":
    "الاعتماد يربطك بشبكة توظيف من 340 استوديو في أوروبا.",
  "Signals from the field": "أصداء من الميدان",
  "Your next level": "مستواك القادم",
  "starts now": "يبدأ الآن",
  "Seats in the 2026 cohorts are limited by lab capacity. Reserve your place and get the full curriculum pack.":
    "مقاعد دفعات 2026 محدودة بسعة المختبر. احجز مكانك واحصل على البرنامج الكامل.",
  "Read movement like a machine does.": "اقرأ الحركة كما تقرأها الآلة.",
  "Turn data into human progress.": "حوّل البيانات إلى تقدم بشري.",
  "Pose estimation": "تقدير الوضعية",
  "Sensor fusion": "دمج المستشعرات",
  Reporting: "التقارير",
  "Movement Data": "بيانات الحركة",
  "AI Motion": "AI Motion",
  "AI Motion Analytics": "تحليل الحركة بالذكاء الاصطناعي",

  /* about */
  "Our story": "قصتنا",
  "How the academy grew": "كيف نمت الأكاديمية",
  "i-Motion started as a two-person lab obsessed with electro-muscular stimulation. Ten years later it is a full ecosystem: physiology, coaching craft, business systems and applied AI — taught by people who still work with clients every week.":
    "بدأت i-Motion كمختبر من شخصين مهووسين بالتحفيز الكهربائي العضلي. بعد عشر سنوات أصبحت منظومة كاملة: فسيولوجيا، حرفة تدريب، أنظمة أعمال وذكاء اصطناعي تطبيقي — يدرّسها من لا يزالون يعملون مع العملاء أسبوعيًا.",
  "The first EMS suit": "أول بدلة EMS",
  "Two coaches, one suit and a rented room. Every protocol was written by hand after each session.":
    "مدربان وبدلة واحدة وقاعة مستأجرة. كل بروتوكول كُتب يدويًا بعد كل حصة.",
  "i-Motion Club opens": "افتتاح نادي i-Motion",
  "From one suit to a full studio.": "من بدلة واحدة إلى استوديو كامل.",
  "Built for people who move.": "مصمم لمن يتحركون.",
  "What we refuse to compromise on": "ما لا نساوم عليه",
  "Lab first": "المختبر أولًا",
  "Every claim we teach is validated in our own physiology lab before it reaches a slide.":
    "كل معلومة نعلّمها تُختبر في مختبر الفسيولوجيا لدينا قبل أن تصل إلى شريحة عرض.",
  "Small cohorts": "دفعات صغيرة",
  "Sixteen seats maximum per on-site lab. You touch the equipment, every hour.":
    "ستة عشر مقعدًا كحد أقصى لكل مختبر حضوري. تلمس المعدات في كل ساعة.",
  "Open data": "بيانات مفتوحة",
  "Learners see their own assessment data, raw and unfiltered, forever.":
    "يرى المتدربون بيانات تقييمهم كاملة وغير مُنقّحة، إلى الأبد.",
  "Career-linked": "مرتبط بالمهنة",
  "Certification, studio network access and business playbooks.":
    "اعتماد، ودخول شبكة الاستوديوهات، وأدلة عملية للأعمال.",
  "Trainer ·": "مدرّب ·",
  "Book a visit": "احجز زيارة",

  /* catalog & trainings */
  "Training catalog": "كتالوج التكوينات",
  "Six programs, one standard: everything is taught by practitioners and validated in our lab.":
    "ستة برامج ومعيار واحد: كل شيء يدرّسه ممارسون ويُعتمد في مختبرنا.",
  "AI advisor": "المستشار الذكي",
  "AI assistant": "المساعد الذكي",
  "Answer three questions — our recommendation engine matches your profile, goal and experience level with the right certification path.":
    "أجب عن ثلاثة أسئلة — يوائم محرك التوصية بين ملفك وهدفك ومستوى خبرتك والمسار المناسب.",
  "Answer three questions about your profile, your goal and your experience. ORBIT matches you with the i-Motion program that fits — and tells you what the certification actually covers.":
    "أجب عن ثلاثة أسئلة حول ملفك وهدفك وخبرتك. يقترح عليك ORBIT برنامج i-Motion المناسب ويوضح ما يغطيه الاعتماد فعليًا.",
  "Question 1 of 3": "السؤال 1 من 3",
  "Question 2 of 3": "السؤال 2 من 3",
  "Question 3 of 3": "السؤال 3 من 3",
  "What's your professional profile?": "ما هو ملفك المهني؟",
  "New to the industry": "جديد في المجال",
  "Personal trainer / coach": "مدرب شخصي / كوتش",
  "Studio owner or manager": "مالك أو مدير استوديو",
  "Search programs": "ابحث عن برنامج",
  "Max price": "أقصى سعر",
  "Maximum price": "السعر الأقصى",
  All: "الكل",
  Coaching: "التدريب",
  Nutrition: "التغذية",
  Business: "الأعمال",
  Tech: "التقنية",
  Data: "البيانات",
  Recovery: "الاستشفاء",
  Safety: "السلامة",
  Precision: "الدقة",
  Flagship: "البرنامج الرئيسي",
  "Quick view": "عرض سريع",
  Details: "التفاصيل",
  Register: "التسجيل",
  "Reserve my seat": "احجز مقعدي",
  "Certification path": "مسار الاعتماد",
  "Curriculum modules": "وحدات البرنامج",
  "The EMS Coach Pro curriculum is formalised into six modules with supervised suit labs.":
    "برنامج EMS Coach Pro منظّم في ست وحدات مع مختبرات بدلة تحت إشراف.",
  "EMS Physiology": "فسيولوجيا EMS",
  "EMS Technology": "تقنية EMS",
  "EMS technology": "تقنية EMS",
  "Impulse physiology": "فسيولوجيا النبضة",
  "Impulse parameters, suit architecture and machine handling.":
    "معايير النبضة وبنية البدلة والتعامل مع الجهاز.",
  "Safety & Contraindications": "السلامة وموانع الاستعمال",
  "Screening, medical flags and how to stop a session correctly.":
    "الفحص والمؤشرات الطبية وكيفية إيقاف الحصة بشكل صحيح.",
  "Training Methodology": "منهجية التدريب",
  "Training methodology": "منهجية التدريب",
  Methodology: "المنهجية",
  "Structuring the 20-minute session and progression over blocks.":
    "هيكلة حصة العشرين دقيقة والتدرج عبر الكتل التدريبية.",
  Periodization: "التدرج الزمني",
  "Adapting protocols to profile, goal and tolerance.":
    "تكييف البروتوكولات حسب الملف والهدف والتحمل.",
  "Coaching & Client Acquisition": "التدريب واستقطاب العملاء",
  "Practical Labs": "مختبرات عملية",
  "Practical Training": "تكوين عملي",
  "Suit labs with clients": "مختبرات البدلة مع العملاء",
  "Supervised suit labs on real clients, scored on protocol.":
    "مختبرات بدلة تحت الإشراف على عملاء حقيقيين، تُقيَّم على البروتوكول.",
  "Personalized Sessions": "حصص مخصصة",
  "Performance Coaching": "تدريب الأداء",
  "Performance Coaching Lab": "مختبر تدريب الأداء",
  "Elite Coaching": "تدريب النخبة",
  "Applied Sports Nutrition": "التغذية الرياضية التطبيقية",
  "Fuel strategy for high-output bodies.": "استراتيجية تغذية للأجسام عالية الأداء.",
  "Studio Business Accelerator": "مسرّع أعمال الاستوديو",
  "Studio operations, pricing and client acquisition for training professionals.":
    "تشغيل الاستوديو والتسعير واستقطاب العملاء لمحترفي التكوين.",
  "Professional English for Coaches": "الإنجليزية المهنية للمدربين",
  "Professional coaching": "تدريب مهني",
  "Coaching language": "لغة التدريب",
  "Coach certification": "اعتماد المدرب",
  "EMS Certified": "معتمد EMS",
  Certified: "معتمد",
  Format: "الصيغة",
  Hybrid: "هجين",
  "On-site": "حضوري",
  Remote: "عن بُعد",
  "Live online": "مباشر عبر الإنترنت",
  Live: "مباشر",

  /* sessions */
  Calendar: "الروزنامة",
  "Upcoming sessions": "الحصص القادمة",
  "Every cohort runs in person with a limited lab capacity. Pick a city, check the remaining seats and lock your place.":
    "كل دفعة تُقام حضوريًا بسعة محدودة. اختر مدينة وتحقق من المقاعد المتبقية واحجز مكانك.",
  City: "المدينة",
  Choose: "اختر",
  Open: "مفتوح",
  Closed: "مغلق",
  Full: "مكتمل",
  "Almost full": "شبه مكتمل",
  "seats left": "مقاعد متبقية",
  dates: "تواريخ",
  sessions: "حصص",
  days: "أيام",

  /* contact */
  "Send a message": "أرسل رسالة",
  "Send message": "إرسال الرسالة",
  "Group bookings, prerequisites, certificate verification — we answer within one business day.":
    "حجوزات جماعية، شروط مسبقة، التحقق من الشهادات — نرد خلال يوم عمل واحد.",
  Subject: "الموضوع",
  Message: "الرسالة",
  Send: "إرسال",
  Ask: "اسأل",
  "Ask about EMS certification…": "اسأل عن اعتماد EMS…",
  "I'm ORBIT. Ask me about programs, prerequisites, prices or upcoming sessions.":
    "أنا ORBIT. اسألني عن البرامج أو الشروط أو الأسعار أو الحصص القادمة.",
  "ORBIT · Academy guide": "ORBIT · دليل الأكاديمية",
  "A guided conversation to find the right certification path.":
    "محادثة موجّهة للعثور على مسار الاعتماد المناسب.",

  /* auth */
  "Welcome back": "مرحبًا بعودتك",
  "Sign in to your academy space.": "سجّل الدخول إلى مساحتك في الأكاديمية.",
  "Continue with Google": "المتابعة عبر Google",
  Email: "البريد الإلكتروني",
  Password: "كلمة المرور",
  "First name": "الاسم",
  "Last name": "اللقب",
  Phone: "الهاتف",
  "Phone (optional)": "الهاتف (اختياري)",
  "Create account": "إنشاء حساب",
  "Create an account": "إنشاء حساب",
  "Create your participant account in under a minute.":
    "أنشئ حساب المشارك الخاص بك في أقل من دقيقة.",
  "Already registered?": "مسجّل بالفعل؟",
  "Forgot password": "نسيت كلمة المرور",
  "Forgot password?": "نسيت كلمة المرور؟",
  "Send reset link": "إرسال رابط إعادة التعيين",
  "Back to sign in": "العودة إلى تسجيل الدخول",
  "Demo accounts: participant@i-motion.academy · admin@i-motion.academy (any password).":
    "حسابات تجريبية: participant@i-motion.academy · admin@i-motion.academy (أي كلمة مرور).",

  /* dashboard & admin */
  "My Academy": "أكاديميتي",
  Overview: "نظرة عامة",
  "My registrations": "تسجيلاتي",
  Registrations: "التسجيلات",
  Payments: "المدفوعات",
  Certificates: "الشهادات",
  "Certificates & diplomas": "الشهادات والدبلومات",
  Notifications: "الإشعارات",
  Profile: "الملف الشخصي",
  Analytics: "التحليلات",
  Administration: "الإدارة",
  "Participants & users": "المشاركون والمستخدمون",
  "Contact requests": "طلبات الاتصال",
  "Your registrations, payments and certificates in one place.":
    "تسجيلاتك ومدفوعاتك وشهاداتك في مكان واحد.",
  "Follow each file from submission to certificate.":
    "تابع كل ملف من الإيداع حتى الشهادة.",
  "Every transaction linked to your registrations.": "كل معاملة مرتبطة بتسجيلاتك.",
  "Numbered documents issued after each validated assessment.":
    "وثائق مرقّمة تُصدر بعد كل تقييم مُصادق عليه.",
  "Reminders, payments and status changes.": "تذكيرات ومدفوعات وتغييرات الحالة.",
  "Your account details.": "تفاصيل حسابك.",
  "Academy-wide activity, revenue and operations at a glance.":
    "نشاط الأكاديمية وإيراداتها وعملياتها في لمحة.",
  "Deep dive into performance, revenue and demand signals.":
    "تحليل معمّق للأداء والإيرادات ومؤشرات الطلب.",
  "You have full control over the catalog: create, edit and delete programs.":
    "لديك تحكم كامل في الكتالوج: إنشاء البرامج وتعديلها وحذفها.",
  "Plan dates, capacity and instructors. Administration has full control.":
    "خطط التواريخ والسعة والمدربين. الإدارة تملك التحكم الكامل.",
  "Validate files, follow payments and completion.":
    "صادق على الملفات وتابع المدفوعات والإتمام.",
  "All recorded transactions.": "كل المعاملات المسجلة.",
  "Issued certificates and diplomas.": "الشهادات والدبلومات الصادرة.",
  "Accounts across every role.": "الحسابات بجميع الأدوار.",
  "Messages sent from the public contact form.": "رسائل واردة من نموذج الاتصال العام.",
  "Latest registrations": "أحدث التسجيلات",
  "Recent registrations": "تسجيلات حديثة",
  "Registrations trend": "تطور التسجيلات",
  "Registrations vs revenue": "التسجيلات مقابل الإيرادات",
  "Registration status mix": "توزيع حالات التسجيل",
  "Revenue by axis": "الإيرادات حسب المحور",
  "Revenue balance by axis": "توازن الإيرادات حسب المحور",
  "Payment method mix": "توزيع وسائل الدفع",
  "Session occupancy": "نسبة امتلاء الحصص",
  "Live session occupancy": "امتلاء الحصص الجارية",
  "Most demanded trainings": "التكوينات الأكثر طلبًا",
  "Training popularity": "شعبية التكوينات",
  "Next session": "الحصة القادمة",
  "No upcoming session": "لا توجد حصة قادمة",
  "No registration yet": "لا يوجد تسجيل بعد",
  "No payment recorded": "لا يوجد دفع مسجل",
  "No certificate yet": "لا توجد شهادة بعد",
  "No request": "لا توجد طلبات",
  "Nothing new": "لا جديد",
  "Audit logs": "سجلات التدقيق",
  "Administrative actions and active user sessions across the platform.": "إجراءات الإدارة وجلسات المستخدمين النشطة عبر المنصة.",
  "Admin actions": "إجراءات الإدارة",
  "Active sessions": "الجلسات النشطة",
  "Risky sessions": "جلسات عالية المخاطر",
  "Last sync": "آخر مزامنة",
  Filters: "عوامل التصفية",
  "Search and filter admin actions": "ابحث عن إجراءات الإدارة وصفّها",
  Status: "الحالة",
  "All statuses": "كل الحالات",
  Success: "ناجح",
  Warning: "تحذير",
  Failed: "فشل",
  "Actor role": "دور المنفذ",
  "All roles": "كل الأدوار",
  "Entity type": "نوع الكيان",
  "All entities": "كل الكيانات",
  "From date": "من تاريخ",
  "To date": "إلى تاريخ",
  "Export to CSV": "تصدير إلى CSV",
  "Recent privileged actions across the academy": "أحدث الإجراءات ذات الصلاحيات في الأكاديمية",
  "No actions logged": "لا توجد إجراءات مسجلة",
  "There are no admin actions recorded yet.": "لا توجد إجراءات إدارية مسجلة بعد.",
  "User sessions": "جلسات المستخدمين",
  "Connected users and their device context": "المستخدمون المتصلون وسياق أجهزتهم",
  "No active sessions": "لا توجد جلسات نشطة",
  "There are no user sessions to display.": "لا توجد جلسات مستخدمين لعرضها.",
  User: "المستخدم",
  Device: "الجهاز",
  Location: "الموقع",
  "Last seen": "آخر ظهور",
  "Sport & Coaching": "الرياضة والتدريب",
  "EMS · Pilates · Personal Training · Fitness · Functional Training · Physical Preparation":
    "EMS · بيلاتس · تدريب شخصي · لياقة بدنية · تدريب وظيفي · إعداد بدني",
  "Well-being": "العافية",
  "French · English · German · Italian · Spanish · Chinese": "الفرنسية · الإنجليزية · الألمانية · الإيطالية · الإسبانية · الصينية",
  "Explore our training programs": "استكشف برامجنا التدريبية",
  "BTP & BTS programs": "برامج BTP وBTS",
  "IT, commerce, accounting, marketing, management and networks.": "تقنية المعلومات والتجارة والمحاسبة والتسويق والإدارة والشبكات.",
  "BTP/BTS diplomas are shown as accredited only after official authorization. Other programs issue an i-Motion certificate.":
    "تُعرض شهادات BTP/BTS كمعتمدة فقط بعد الحصول على الترخيص الرسمي. تمنح البرامج الأخرى شهادة i-Motion.",
  "My feedback": "ملاحظاتي",
  "Share your feedback on your completed training programs": "شارك ملاحظاتك حول برامجك التدريبية المكتملة",
  "Completed sessions": "الجلسات المكتملة",
  "No completed sessions yet": "لا توجد جلسات مكتملة بعد",
  "Sessions in progress": "الجلسات الجارية",
  "No trainer assigned": "لم يُعيَّن مدرب",
  "✓ Completed": "✓ مكتملة",
  Hide: "إخفاء",
  "Give feedback": "أرسل ملاحظاتك",
  "Feedback will be available after the session ends": "ستتاح الملاحظات بعد انتهاء الجلسة",
};

export const phrases: Record<"en" | "fr" | "ar", PhraseMap> = { en: {}, fr, ar };

/** Translate a single phrase, falling back to the original English text. */
export function translatePhrase(text: string, lang: "en" | "fr" | "ar"): string {
  if (lang === "en") return text;
  const map = phrases[lang];
  const trimmed = text.trim();
  const direct = map[trimmed];
  if (direct) return text.replace(trimmed, direct);
  // tolerate trailing punctuation differences
  const stripped = trimmed.replace(/[.:!?]+$/, "");
  const alt = map[stripped];
  if (alt) return text.replace(trimmed, alt + trimmed.slice(stripped.length));
  return text;
}

/*
 * Routes keep their source copy in English. This layer applies the selected
 * dictionary to every rendered page, including newly loaded page content.
 * The original copy is retained per DOM node so each change starts from the
 * English source rather than from a previous translation.
 */
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const translatableAttributes = ["aria-label", "placeholder", "title", "alt"];

function shouldTranslate(node: Text) {
  const parent = node.parentElement;
  return Boolean(parent && !parent.closest("script, style, noscript, code, pre, textarea, [data-no-translate]"));
}

function translateTree(root: Node, lang: "en" | "fr" | "ar") {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = root.nodeType === Node.TEXT_NODE ? [root as Text] : [];
  let node: Node | null;
  while ((node = walker.nextNode())) textNodes.push(node as Text);

  for (const textNode of textNodes) {
    if (!shouldTranslate(textNode) || !textNode.nodeValue?.trim()) continue;
    const source = originalText.get(textNode) ?? textNode.nodeValue;
    originalText.set(textNode, source);
    const translated = translatePhrase(source, lang);
    if (textNode.nodeValue !== translated) textNode.nodeValue = translated;
  }

  const elements = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [];
  for (const element of elements) {
    if (element.matches("script, style, noscript, [data-no-translate]")) continue;
    const sources = originalAttributes.get(element) ?? new Map<string, string>();
    originalAttributes.set(element, sources);
    for (const attribute of translatableAttributes) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const source = sources.get(attribute) ?? value;
      sources.set(attribute, source);
      const translated = translatePhrase(source, lang);
      if (value !== translated) element.setAttribute(attribute, translated);
    }
  }
}

/** Applies the selected language to all currently rendered application copy. */
export function usePageTranslation(lang: "en" | "fr" | "ar") {
  useEffect(() => {
    const translate = (root: Node) => translateTree(root, lang);
    translate(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) translate(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [lang]);
}
