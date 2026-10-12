# Feedback Module - Documentation

## 📋 Overview

The Feedback module allows participants to provide feedback on completed sessions. This includes:
- ⭐ Rating (1-5 stars)
- 💬 Comments with bad words detection
- 📊 Admin moderation and approval
- 🏆 Featured testimonials for home page display

---

## ✅ What Has Been Implemented

### 1. **Database Layer**
- ✅ Migration: `0013_create_feedback.sql`
- Table: `feedback` with all required fields
- Indexes for performance optimization
- Trigger for automatic `updated_at` timestamp

### 2. **Entity**
- ✅ `Feedback` entity with:
  - `id`, `registrationId`, `userId`, `sessionId`
  - `rating` (1-5)
  - `comment` (text, nullable)
  - `feedbackType` (TRAINING, TRAINER, LOGISTICS, CONTENT)
  - `isPublished` (admin approval)
  - `isFeatured` (star for home page)
  - `containsBadWords` (flag detection)
  - `flaggedReason` (reason for bad words)

### 3. **DTOs**
- ✅ `CreateFeedbackDto` - validation for feedback submission
- ✅ `UpdateFeedbackDto` - validation for feedback updates

### 4. **Services**

#### BadWordsService
- ✅ `checkBadWords(text)` - Detects bad words in text
- ✅ `sanitizeText(text)` - Replaces bad words with asterisks
- ✅ `isSafeComment(text, maxAllowed)` - Safety check
- ✅ `addBadWord(word)` - Admin adds custom bad words
- ✅ `removeBadWord(word)` - Admin removes bad words
- ✅ `getAllBadWords()` - Returns list of all bad words

#### FeedbackService
- ✅ `createFeedback()` - Submit feedback with eligibility checks
- ✅ `getFeedbackByRegistration()` - Get participant's feedback
- ✅ `updateFeedback()` - Update feedback (7-day window)
- ✅ `isFeedbackAvailable()` - Check if feedback can be submitted
- ✅ `getTestimonials()` - Get featured feedbacks for home
- ✅ `getSessionFeedbackStats()` - Stats for a session
- ✅ `getTrainingFeedbackStats()` - Stats for a training
- ✅ `getTrainerFeedbackStats()` - Stats for a trainer
- ✅ `checkBadWords()` - API for bad words checking

### 5. **Controllers**

#### FeedbackController (Participant/Public)
- ✅ `POST /feedback` - Submit feedback
- ✅ `GET /feedback/:registrationId` - Get feedback
- ✅ `GET /feedback/:registrationId/available` - Check availability
- ✅ `PATCH /feedback/:feedbackId` - Update feedback (7-day window)
- ✅ `POST /feedback/check-bad-words` - Real-time bad words check
- ✅ `GET /feedback/public/testimonials` - Get home page testimonials
- ✅ `GET /feedback/session/:sessionId/stats` - Session stats
- ✅ `GET /feedback/training/:trainingId/stats` - Training stats
- ✅ `GET /feedback/trainer/:trainerId/stats` - Trainer stats

#### AdminFeedbackController (Admin Only)
- ✅ `GET /admin/feedback` - Get all feedback with filters
- ✅ `GET /admin/feedback/queue` - Get pending approval queue
- ✅ `PATCH /admin/feedback/:feedbackId/publish` - Approve feedback
- ✅ `PATCH /admin/feedback/:feedbackId/star` - Star feedback for home
- ✅ `DELETE /admin/feedback/:feedbackId` - Reject/delete feedback
- ✅ `GET /admin/feedback/featured` - Get featured testimonials
- ✅ `GET /admin/feedback/stats/dashboard` - Dashboard statistics

### 6. **Module Integration**
- ✅ `FeedbackModule` created and exported
- ✅ Integrated into `AppModule`

---

## 🚀 API Endpoints

### Participant Endpoints

#### Submit Feedback
```
POST /feedback
Content-Type: application/json
Authorization: Bearer <token>

{
  "registrationId": "uuid",
  "rating": 5,
  "comment": "Excellent course!",
  "feedbackType": "TRAINING"
}

Response: 201 Created
{
  "id": "uuid",
  "registrationId": "uuid",
  "userId": "uuid",
  "sessionId": "uuid",
  "rating": 5,
  "comment": "Excellent course!",
  "feedbackType": "TRAINING",
  "isPublished": false,
  "isFeatured": false,
  "containsBadWords": false,
  "flaggedReason": null,
  "createdAt": "2026-09-02T..."
}
```

#### Check Feedback Availability
```
GET /feedback/:registrationId/available
Authorization: Bearer <token>

Response: 200 OK
{
  "available": true,
  "sessionEndDate": "2026-09-01T...",
  "feedbackDeadline": "2026-10-01T..."
}
```

#### Real-time Bad Words Check
```
POST /feedback/check-bad-words
Content-Type: application/json
Authorization: Bearer <token>

{
  "text": "This course is damn great"
}

Response: 200 OK
{
  "hasBadWords": true,
  "detectedWords": ["damn"],
  "warning": "⚠️ Your comment contains inappropriate words: damn. They will be masked in the final submission."
}
```

#### Update Feedback (within 7 days)
```
PATCH /feedback/:feedbackId
Authorization: Bearer <token>

{
  "rating": 4,
  "comment": "Good but could be better"
}

Response: 200 OK
```

#### Get Public Testimonials
```
GET /feedback/public/testimonials
(No auth required)

Response: 200 OK
[
  {
    "id": "uuid",
    "rating": 5,
    "comment": "Excellent course!",
    "userName": "Jean Dupont",
    "trainingName": "Python Advanced",
    "createdAt": "2026-09-01T..."
  }
]
```

---

### Admin Endpoints

#### Get All Feedback (with filters)
```
GET /admin/feedback?isPublished=false&containsBadWords=true&minRating=3&page=1&limit=20
Authorization: Bearer <admin-token>

Response: 200 OK
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### Get Approval Queue
```
GET /admin/feedback/queue
Authorization: Bearer <admin-token>

Response: 200 OK
{
  "data": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "Great course!",
      "feedbackType": "TRAINING",
      "isPublished": false,
      "isFeatured": false,
      "containsBadWords": false,
      "userName": "Jean Dupont",
      "trainingName": "Python Advanced",
      "createdAt": "2026-09-02T..."
    }
  ],
  "pagination": {...}
}
```

#### Publish Feedback
```
PATCH /admin/feedback/:feedbackId/publish
Authorization: Bearer <admin-token>

Response: 200 OK
{ "isPublished": true, ... }
```

#### Star Feedback for Home
```
PATCH /admin/feedback/:feedbackId/star
Authorization: Bearer <admin-token>

Response: 200 OK
{ "isFeatured": true, ... }
```

#### Reject Feedback
```
DELETE /admin/feedback/:feedbackId
Authorization: Bearer <admin-token>

Response: 200 OK
{ "message": "Feedback rejected and deleted" }
```

#### Get Dashboard Stats
```
GET /admin/feedback/stats/dashboard
Authorization: Bearer <admin-token>

Response: 200 OK
{
  "totalFeedbacks": 347,
  "publishedFeedbacks": 320,
  "featuredFeedbacks": 3,
  "flaggedFeedbacks": 8,
  "averageRating": 4.2,
  "ratingBreakdown": {
    "5": 180,
    "4": 90,
    "3": 40,
    "2": 8,
    "1": 2
  },
  "pendingApproval": 27
}
```

---

## 🛡️ Bad Words Detection

### Features:
- ✅ **Real-time validation** - Check before submission
- ✅ **Multi-language** - English, French, and common slang
- ✅ **Comprehensive list** - 50+ bad words included
- ✅ **Sanitization** - Replace with asterisks (*****)
- ✅ **Customizable** - Admin can add/remove words
- ✅ **Flagging** - Bad words are marked in DB for review

### Included Bad Words:
- French profanities: connard, salaud, putain, merde, con, etc.
- English profanities: shit, damn, hell, bitch, fuck, etc.
- Hate speech indicators: terrorist, racist, sexist, etc.
- Spam indicators: viagra, casino, bitcoin, etc.
- Offensive terms: idiot, retard, stupid, moron, etc.

---

## 📋 Business Rules

### Feedback Submission
1. ✅ Session must be **completed** (ended)
2. ✅ Must be within **30 days** of session end
3. ✅ Registration status must be **COMPLETED**
4. ✅ Cannot submit **duplicate feedback** for same type
5. ✅ Auto-flag if **bad words detected**

### Feedback Update
1. ✅ Only within **7 days** of creation
2. ✅ Cannot update if **already published**
3. ✅ Re-checks for bad words on update

### Admin Moderation
1. ✅ Must **publish** before display (except stats)
2. ✅ Only **published** feedbacks can be **starred**
3. ✅ Can **reject** (delete) inappropriate feedback
4. ✅ Can filter by: published, featured, bad words, rating
5. ✅ See **approval queue** (unpublished first)

### Home Page Display
1. ✅ Show **3+ testimonials** (configurable by admin)
2. ✅ Only **published** and **featured** feedbacks
3. ✅ No **bad words detected**
4. ✅ Sorted by **newest first**

---

## 🗂️ File Structure

```
backend/src/feedback/
├── entities/
│   └── feedback.entity.ts          # Feedback entity definition
├── dto/
│   ├── create-feedback.dto.ts      # Create validation
│   └── update-feedback.dto.ts      # Update validation
├── services/
│   ├── feedback.service.ts         # Main feedback logic
│   └── bad-words.service.ts        # Bad words detection
├── feedback.controller.ts          # Participant/Public endpoints
├── admin-feedback.controller.ts    # Admin endpoints
├── feedback.module.ts              # Module definition
└── README.md                       # This file

backend/migrations/
└── 0013_create_feedback.sql        # Database migration
```

---

## 🔧 Next Steps

### To Complete Implementation:

1. ✅ **Run the migration**
   ```bash
   psql -d imotion_dev -f migrations/0013_create_feedback.sql
   ```

2. ✅ **Add Notifications Module Integration**
   - Email on feedback submission
   - Email on approval
   - Reminder email after 7 days
   - Admin notification on new feedback

3. ✅ **Frontend Integration**
   - Feedback form component
   - Bad words warning component
   - Testimonials carousel on home
   - Admin dashboard

4. ✅ **Analytics Integration**
   - Add feedback KPIs to analytics
   - Rating trends chart
   - Formations/trainers ranked by rating

5. ✅ **Cron Jobs** (Optional)
   - Auto-send reminders after 7 days
   - Auto-notify admin about pending approval
   - Auto-close 30-day feedback window

---

## 📊 Default Bad Words List

The service includes:
- **30+ French profanities**
- **30+ English profanities**
- **10+ hate speech indicators**
- **15+ spam/scam keywords**

This is **extensible** - admin can add custom words via service methods.

---

## ⚙️ Configuration

No environment variables needed. All rules are hardcoded:
- **Feedback window**: 30 days after session end
- **Update window**: 7 days after creation
- **Testimonials default**: 3 (configurable by admin)
- **Bad words check**: Automatic on submit/update

---

## 🎯 Summary

✅ **Complete Feedback Module** with:
- ✅ Participant submission & management
- ✅ Admin moderation & approval
- ✅ Bad words detection & flagging
- ✅ Statistics & analytics
- ✅ Home page testimonials
- ✅ Role-based access control
- ✅ Comprehensive API
- ✅ Database persistence
- ✅ Business logic enforcement

**Ready to integrate with Frontend!** 🚀
