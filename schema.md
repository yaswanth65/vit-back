# VITUOR - Journal Manuscript Management System

## Complete System Documentation

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Roles & Responsibilities](#roles--responsibilities)
4. [Complete Workflow Scenarios](#complete-workflow-scenarios)
5. [API Summary by Role](#api-summary-by-role)
6. [State Transitions](#state-transitions)

---

## System Overview

**VITUOR** is a comprehensive journal manuscript management system that handles the entire lifecycle of academic paper submission, peer review, and publication.

### Key Features

- Multi-step author registration with email verification
- Manuscript submission with version control
- Peer review assignment and management
- Editorial decision workflow
- Issue compilation and publication
- Support ticket system
- OAuth integration (ORCID, Google Scholar, SAML SSO)

---

## Database Schema

### Core Entities Relationship

```
┌─────────────────┐
│     USERS       │ (Central table for all user types)
│─────────────────│
│ id (PK)         │
│ email (unique)  │
│ role (ENUM)     │◄──────────────────┐
│ first_name      │                   │
│ last_name       │                   │
│ prefix          │                   │
│ is_active       │                   │
└────────┬────────┘                   │
         │                            │
         │ (1:1 relationships)        │
         │                            │
    ┌────┴────┬────────┬────────┬────┴───┬────────┐
    │         │        │        │        │        │
    ▼         ▼        ▼        ▼        ▼        ▼
┌────────┐┌──────┐┌────────┐┌──────┐┌──────┐┌───────┐
│AUTHORS ││REVIEW││EDITORS ││ EICS ││ADMINS││ AUTH  │
│        ││ERS   ││        ││      ││      ││ META  │
└───┬────┘└───┬──┘└───┬────┘└──────┘└──────┘└───────┘
    │         │       │
    │         │       │
    ▼         │       ▼
┌──────────┐  │  ┌──────────────┐
│MANUSCRIPTS│  │  │ASSIGN        │
│  (M:1)    │  │  │REVIEWERS     │◄──────┐
└─────┬─────┘  │  │  (M:N Join)  │       │
      │        │  └──────┬───────┘       │
      │        │         │               │
      │        └─────────┼───────────────┘
      │                  │
      ├──────────────────┼────────────┐
      │                  │            │
      ▼                  ▼            ▼
┌──────────┐      ┌──────────┐  ┌──────────────┐
│ REVIEWS  │      │MANUSCRIPT│  │REVIEW        │
│          │      │VERSIONS  │  │COMMENTS      │
└──────────┘      └──────────┘  └──────────────┘
      │
      │
┌─────┴─────┐
│  ISSUES   │ (Publication compilation)
└───────────┘
```

### Detailed Table Descriptions

#### 1. **USERS** (Core User Table)

Central table for all system users regardless of role.

| Field              | Type          | Description                                    |
| ------------------ | ------------- | ---------------------------------------------- |
| id                 | UUID          | Primary key                                    |
| email              | STRING(255)   | Unique email address                           |
| role               | ENUM          | Author, Reviewer, Editor, EditorInChief, Admin |
| prefix             | ENUM          | Dr., Prof., Mr., Ms., Mx.                      |
| first_name         | STRING(100)   | Required                                       |
| last_name          | STRING(100)   | Required                                       |
| profile_image      | JSON          | File metadata                                  |
| specialties        | ARRAY(STRING) | Areas of expertise                             |
| is_active          | BOOLEAN       | Account status                                 |
| deactivated_at     | DATE          | Soft delete timestamp                          |
| deactivated_reason | STRING(500)   | Reason for deactivation                        |

#### 2. **AUTHENTICATION_META**

One-to-one with Users. Handles all authentication-related data.

| Field                       | Type        | Description                   |
| --------------------------- | ----------- | ----------------------------- |
| user_id                     | UUID        | FK to users (unique)          |
| password_hash               | STRING(255) | Bcrypt hash                   |
| is_email_verified           | BOOLEAN     | Email verification status     |
| email_verification_token    | STRING      | Verification token            |
| magic_link_token            | STRING      | Passwordless login token      |
| registration_step           | ENUM        | '1', '2', '3', 'completed'    |
| registration_otp            | STRING(6)   | 6-digit OTP                   |
| registration_otp_expires_at | DATE        | OTP expiration                |
| invitation_token            | STRING      | For invited reviewers/editors |
| invited_by                  | UUID        | FK to users (inviter)         |
| password_reset_token        | STRING      | Password reset token          |
| current_refresh_token       | TEXT        | JWT refresh token             |
| temp_academic_metrics       | JSONB       | OAuth fetched data            |

#### 3. **AUTHORS**

One-to-one with Users (where role='Author').

| Field              | Type          | Description          |
| ------------------ | ------------- | -------------------- |
| user_id            | UUID          | FK to users (unique) |
| orcid_id           | STRING(50)    | ORCID identifier     |
| google_scholar_id  | STRING(100)   | Google Scholar ID    |
| saml_student_id    | STRING(100)   | Institutional SSO ID |
| institution        | STRING(255)   | Affiliation          |
| department         | STRING(255)   | Department           |
| country            | STRING(100)   | Country              |
| phone              | STRING(20)    | Contact number       |
| research_interests | ARRAY(STRING) | Areas of interest    |
| total_publications | INTEGER       | Publication count    |
| h_index            | INTEGER       | H-index metric       |
| total_citations    | INTEGER       | Citation count       |
| billing_name       | STRING(255)   | Billing name         |
| billing_address    | TEXT          | Billing address      |
| invoice_email      | STRING(255)   | Invoice email        |
| tax_id             | STRING(100)   | Tax/VAT ID           |

#### 4. **REVIEWERS**

One-to-one with Users (where role='Reviewer').

| Field               | Type          | Description                         |
| ------------------- | ------------- | ----------------------------------- |
| user_id             | UUID          | FK to users (unique)                |
| professional_bio    | TEXT          | Bio description                     |
| expertise_areas     | ARRAY(STRING) | Areas of expertise                  |
| specialties         | ARRAY(STRING) | Specialty fields                    |
| preferred_journals  | ARRAY(STRING) | Journal preferences                 |
| languages           | ARRAY(STRING) | Languages (default: English)        |
| max_current_reviews | INTEGER       | Max concurrent reviews (default: 3) |
| assigned_category   | STRING        | Primary category (e.g., Oncology)   |
| phone               | STRING(20)    | Contact number                      |
| availability_status | ENUM          | Available, Busy, Unavailable        |
| institution         | STRING(255)   | Affiliation                         |
| department          | STRING(255)   | Department                          |
| country             | STRING(100)   | Country                             |
| metrics             | JSONB         | Performance metrics                 |

#### 5. **EDITORS**

One-to-one with Users (where role='Editor').

| Field                  | Type          | Description                        |
| ---------------------- | ------------- | ---------------------------------- |
| user_id                | UUID          | FK to users (unique)               |
| assigned_category      | STRING        | Unique category (e.g., Cardiology) |
| primary_specialty      | STRING(100)   | Main expertise                     |
| additional_specialties | ARRAY(STRING) | Secondary expertise                |
| kanban_preferences     | JSONB         | UI preferences                     |
| metrics                | JSONB         | Performance metrics                |

#### 6. **EICS (Editor-in-Chief)**

One-to-one with Users (where role='EditorInChief').

| Field                 | Type   | Description             |
| --------------------- | ------ | ----------------------- |
| user_id               | UUID   | FK to users (unique)    |
| journal_scope         | STRING | Scope (default: Global) |
| permissions           | JSONB  | Special permissions     |
| digital_signature_url | STRING | Signature file URL      |

#### 7. **ADMINS**

One-to-one with Users (where role='Admin').

| Field                     | Type  | Description          |
| ------------------------- | ----- | -------------------- |
| user_id                   | UUID  | FK to users (unique) |
| access_level              | JSONB | Permission levels    |
| last_system_config_change | DATE  | Last config change   |

#### 8. **MANUSCRIPTS**

Core document tracking table.

| Field                      | Type          | Description                                                                                     |
| -------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| id                         | UUID          | Primary key                                                                                     |
| author_id                  | UUID          | FK to authors (required)                                                                        |
| reviewer_ids               | ARRAY(UUID)   | Assigned reviewer IDs                                                                           |
| category                   | STRING        | Medical specialty                                                                               |
| manuscript_type            | STRING        | Article type                                                                                    |
| status                     | ENUM          | Draft, Submitted, Editor Review, Under Review, Revision Required, Accepted, Published, Rejected |
| title                      | STRING        | Manuscript title                                                                                |
| abstract                   | TEXT          | Abstract text                                                                                   |
| keywords                   | ARRAY(STRING) | Keywords                                                                                        |
| authors                    | JSONB         | Co-authors list                                                                                 |
| main_file                  | JSONB         | DOCX file metadata                                                                              |
| cover_letter               | JSONB         | Cover letter metadata                                                                           |
| supplementary_files        | JSONB         | Array of supplementary files                                                                    |
| declarations               | JSONB         | Ethics, conflicts, etc.                                                                         |
| version                    | INTEGER       | Version number (default: 1)                                                                     |
| eic_decision               | ENUM          | Accept, Minor Revision, Major Revision, Reject, Pending                                         |
| eic_decision_note          | TEXT          | Decision rationale                                                                              |
| eic_internal_notes         | TEXT          | Internal notes                                                                                  |
| eic_decision_date          | DATE          | Decision timestamp                                                                              |
| visible_comments_to_author | ARRAY(UUID)   | Review IDs visible to author                                                                    |
| max_reviewer_limit         | INTEGER       | Max reviewers (default: 3)                                                                      |
| editor_final_decision      | JSONB         | Editor's recommendation                                                                         |
| editor_submitted_to_eic    | BOOLEAN       | Submitted to EIC flag                                                                           |

#### 9. **ASSIGN_REVIEWERS**

Many-to-many relationship table between manuscripts and reviewers.

| Field              | Type    | Description                                        |
| ------------------ | ------- | -------------------------------------------------- |
| assign_reviewer_id | UUID    | Primary key                                        |
| manuscript_id      | UUID    | FK to manuscripts                                  |
| reviewer_id        | UUID    | FK to reviewers                                    |
| assigned_by        | UUID    | FK to editors (assigner)                           |
| manuscript_version | INTEGER | Version being reviewed                             |
| deadline           | DATE    | Review deadline                                    |
| status             | ENUM    | assigned, accepted, rejected, in_review, completed |

#### 10. **REVIEWS**

Actual review submissions.

| Field                           | Type    | Description                                    |
| ------------------------------- | ------- | ---------------------------------------------- |
| id                              | UUID    | Primary key                                    |
| assign_reviewer_id              | UUID    | FK to assign_reviewers                         |
| manuscript_id                   | UUID    | FK to manuscripts                              |
| reviewer_id                     | UUID    | FK to reviewers                                |
| originality_score               | INTEGER | Score (required)                               |
| methodology_score               | INTEGER | Score (required)                               |
| significance_score              | INTEGER | Score (required)                               |
| clarity_score                   | INTEGER | Score (required)                               |
| language_score                  | INTEGER | Score (required)                               |
| comments_to_author              | TEXT    | Public comments                                |
| confidential_comments_to_editor | TEXT    | Private comments                               |
| recommendation                  | ENUM    | Accept, Minor Revision, Major Revision, Reject |
| status                          | ENUM    | Draft, Submitted                               |
| annotations                     | JSONB   | Document annotations                           |
| is_visible_to_author            | BOOLEAN | Visibility flag                                |

#### 11. **REVIEW_COMMENTS**

Granular line-by-line comments.

| Field       | Type    | Description               |
| ----------- | ------- | ------------------------- |
| id          | UUID    | Primary key               |
| review_id   | UUID    | FK to reviews             |
| page_number | INTEGER | Page reference            |
| line_number | INTEGER | Line reference (optional) |
| comment     | TEXT    | Comment text              |
| type        | ENUM    | major, minor, suggestion  |

#### 12. **MANUSCRIPT_VERSIONS**

Version control for revisions.

| Field               | Type    | Description              |
| ------------------- | ------- | ------------------------ |
| id                  | UUID    | Primary key              |
| manuscript_id       | UUID    | FK to manuscripts        |
| version_number      | FLOAT   | Version (e.g., 1.0, 2.0) |
| main_file           | JSONB   | File metadata            |
| main_file_pdf       | JSONB   | PDF version              |
| supplementary_files | JSONB   | Additional files         |
| author_response     | TEXT    | Response to reviewers    |
| is_finalized        | BOOLEAN | Finalized flag           |

#### 13. **ISSUES**

Journal issue compilation.

| Field                         | Type        | Description                 |
| ----------------------------- | ----------- | --------------------------- |
| id                            | UUID        | Primary key                 |
| manuscripts_ids               | ARRAY(UUID) | Included manuscripts        |
| volume_number                 | INTEGER     | Volume number               |
| issue_number                  | INTEGER     | Issue number                |
| planned_publication_date      | DATE        | Publication date            |
| issue_title                   | STRING      | Title                       |
| description                   | STRING      | Description                 |
| cover_image_url               | STRING      | Cover image                 |
| status                        | ENUM        | Draft, Scheduled, Published |
| published_at                  | DATE        | Publication timestamp       |
| doi                           | STRING      | Unique DOI                  |
| final_files_received          | BOOLEAN     | Files ready                 |
| copyright_agreement_completed | BOOLEAN     | Copyright cleared           |
| metadata_validated            | BOOLEAN     | Metadata validated          |

#### 14. **SUPPORT_TICKETS**

Support ticket system.

| Field          | Type        | Description                  |
| -------------- | ----------- | ---------------------------- |
| id             | UUID        | Primary key                  |
| reviewer_id    | UUID        | FK to reviewers              |
| admin_id       | UUID        | FK to users (admin)          |
| manuscript_id  | UUID        | FK to manuscripts (optional) |
| category       | STRING(100) | Ticket category              |
| subject        | STRING(255) | Ticket subject               |
| description    | TEXT        | Issue description            |
| attachment     | JSONB       | Attachments                  |
| status         | ENUM        | open, in_progress, closed    |
| admin_response | TEXT        | Admin response               |
| resolved_at    | DATE        | Resolution timestamp         |

---

## Roles & Responsibilities

### 1. **Author** (role='Author')

#### Primary Purpose

Submit and manage manuscripts through the submission and revision process.

#### Key Responsibilities

- **Register & Verify Identity**
  - Complete 3-step registration (email → OTP → profile)
  - Connect academic IDs (ORCID, Google Scholar, SAML)
- **Manuscript Submission**
  - Create draft manuscripts
  - Add metadata (title, abstract, keywords)
  - Add co-authors
  - Upload files (main DOCX, cover letter, supplementary)
  - Submit manuscript for review
- **Revision Management**
  - View visible reviewer comments (when EIC permits)
  - Submit revised versions
  - Respond to reviewer feedback
- **Profile Management**
  - Update personal information
  - Manage billing information
  - Update academic metrics
  - Deactivate own account

#### Access Level

- **Can Access**: Own manuscripts, own profile, own billing info
- **Cannot Access**: Reviewer identities, other authors' manuscripts, editorial decisions (except final)

#### Typical Journey

```
Registration → Email Verification → Profile Setup →
Create Draft → Fill Details → Upload Files → Submit →
Wait for Decision → (if revision) View Comments → Submit Revision →
(if accepted) Await Publication
```

---

### 2. **Reviewer** (role='Reviewer')

#### Primary Purpose

Evaluate manuscripts and provide expert feedback to editors.

#### Key Responsibilities

- **Assignment Management**
  - View assigned manuscripts
  - Accept or reject review invitations
  - Manage availability status
- **Review Process**
  - Access assigned manuscript files
  - Score manuscripts across 5 criteria (originality, methodology, significance, clarity, language)
  - Add line-by-line comments
  - Provide recommendations (Accept, Minor/Major Revision, Reject)
  - Submit confidential notes to editors
- **Profile & Preferences**
  - Update expertise areas
  - Set maximum concurrent reviews
  - Manage availability (Available, Busy, Unavailable)
  - Update institutional affiliation
- **Support**
  - Raise support tickets for issues
  - Track ticket status

#### Access Level

- **Can Access**: Assigned manuscripts only, own reviews, own profile
- **Cannot Access**: Other reviewers' comments, author identity (if blinded), EIC decisions

#### Typical Journey

```
Invitation → Accept Assignment → Download Manuscript →
Review & Score → Add Comments → Submit Review →
(optional) Revise Draft Review → Mark as Completed
```

#### Workload Constraints

- Maximum concurrent reviews: configurable (default 3)
- Availability status affects assignment eligibility
- Deadline-based workflow

---

### 3. **Editor** (role='Editor')

#### Primary Purpose

Manage manuscripts within assigned specialty category, coordinate peer review process.

#### Key Responsibilities

- **Manuscript Management**
  - View all manuscripts in assigned category
  - Filter by status, type, search
  - Access full manuscript details
- **Reviewer Assignment**
  - Search reviewers by expertise and availability
  - Assign single or multiple reviewers
  - Set review deadlines
  - Monitor assignment status
- **Review Coordination**
  - Track review progress
  - View all submitted reviews
  - Evaluate reviewer recommendations
- **Editorial Decision**
  - Make preliminary recommendations
  - Add internal notes
  - Submit decision to EIC with rationale
- **Issue Management**
  - Create journal issues
  - Compile accepted manuscripts
  - Export metadata

#### Access Level

- **Can Access**: All manuscripts in assigned category, all reviewers in category
- **Cannot Access**: Manuscripts in other categories, final EIC decision-making

#### Assigned Category

Each editor has **one unique category** (e.g., Oncology, Cardiology).

- Manuscripts are routed based on category
- Reviewers must match category

#### Typical Journey

```
View Submitted Manuscripts → Select Manuscript →
Review Details → Search Reviewers → Assign Reviewers →
Monitor Reviews → Evaluate Feedback →
Make Recommendation → Submit to EIC
```

---

### 4. **Editor-in-Chief (EIC)** (role='EditorInChief')

#### Primary Purpose

Oversee entire journal, make final publication decisions, manage editorial policy.

#### Key Responsibilities

- **Final Decision Authority**
  - Review editor recommendations
  - Access all reviews and assignments
  - Make final decisions (Accept, Reject, Revision)
  - Set which review comments are visible to authors
- **Oversight & Management**
  - View all manuscripts across all categories
  - Access dashboard with system-wide statistics
  - Review audit trails for manuscripts
  - Override reviewer limits if needed
- **Revision Control**
  - Send manuscripts for revision with specific instructions
  - Increase reviewer limits for complex submissions
  - Add notes to authors
- **Quality Assurance**
  - Monitor editor performance
  - Review reviewer pool
  - Track manuscript lifecycle metrics

#### Access Level

- **Can Access**: Everything system-wide (except admin functions)
- **Final Authority**: Publication decisions

#### Dashboard Metrics

- Manuscripts by status
- Category distribution
- Recent submissions
- Decision timelines

#### Typical Journey

```
Review Dashboard → View Pending Manuscripts →
Select Manuscript → Review Editor Recommendation →
Read All Reviews → Make Final Decision →
Set Visible Comments → Notify Author
```

---

### 5. **Admin** (role='Admin')

#### Primary Purpose

System administration, user management, support ticket resolution.

#### Key Responsibilities

- **User Management**
  - Deactivate/reactivate user accounts
  - View all users
  - Manage user roles (via invitations)
- **Support System**
  - View all support tickets
  - Respond to tickets
  - Update ticket status
  - Close resolved tickets
- **System Configuration**
  - Manage system settings (stored in access_level)
  - Track configuration changes

#### Access Level

- **Can Access**: All users, all support tickets, system configuration
- **Cannot Access**: Manuscript content, editorial decisions (read-only)
- **Special**: Cannot deactivate own account

#### Typical Journey

```
View Support Tickets → Select Ticket →
Read Issue → Respond to User → Update Status →
(if needed) Deactivate Problem User → Close Ticket
```

---

## Complete Workflow Scenarios

### Scenario 1: New Author Registration & First Submission

#### Step 1: Registration (3-Step Process)

```
Author Action                    System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Enter email + password     →     Create user (inactive)           POST /api/v1/auth/register/step-1
                                 Generate 6-digit OTP
                                 Send email with OTP

Enter OTP from email       →     Verify OTP                       POST /api/v1/auth/register/verify-otp
                                 Mark email as verified

Fill profile details       →     Update user profile              POST /api/v1/auth/register/finalize
Academic IDs                     Update author table
Research interests               Mark registration complete
Institutional info               Activate account
                                 Send welcome email
```

**Alternative: OAuth Registration**

```
Click "Sign up with ORCID" →    OAuth redirect                   GET /api/v1/auth/orcid
Complete ORCID login       →    Callback receives ORCID ID       GET /api/v1/auth/orcid/callback
                                Fetch publications
                                Encode data, redirect to frontend
Frontend decodes data      →    Pre-fill step 3 form
Submit final registration  →    Complete registration            POST /api/v1/auth/register/finalize
```

#### Step 2: First Manuscript Submission

```
Author Action                    System Response                  Manuscript Status
─────────────────────────────────────────────────────────────────────────────
Click "New Submission"     →     Create manuscript record         Draft
                                 status = 'Draft'

Fill title, abstract,      →     Update manuscript details        Draft
keywords, category

Add co-authors             →     Update authors JSONB field       Draft

Upload main file (DOCX)    →     Upload to R2 storage             Draft
Upload cover letter              Store file metadata in JSONB
Upload supplementary files

Click "Submit"             →     Validate files exist             Submitted
                                 Change status to 'Submitted'
                                 Notify editor of category
```

#### Step 3: Post-Submission

```
System automatically routes manuscript to Editor based on category.
Author can view status but cannot edit submitted manuscript.
```

---

### Scenario 2: Editor Assigns Reviewers & Collects Reviews

#### Step 1: Editor Receives Submission

```
System Action                    Editor Action                    API Endpoint
─────────────────────────────────────────────────────────────────────────────
Manuscript submitted       →     Email notification sent

Editor logs in             →     View manuscripts list            GET /api/v1/editor/manuscripts
Filter by status                 ?status=Submitted                (filters: status, type, search)

Click manuscript           →     View full details                GET /api/v1/editor/manuscripts/:id
                                 Read abstract, download files
```

#### Step 2: Search & Assign Reviewers

```
Editor Action                    System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Click "Assign Reviewers"   →     Show reviewer search form

Search by expertise        →     List reviewers in same category  GET /api/v1/editor/reviewers
Filter by availability           Only show 'Available' reviewers  ?search=...&availability=Available

Select 3 reviewers         →     Create assignment records        POST /api/v1/editor/assignments/bulk
Set deadline                     Send invitation emails
                                 Create review records

                                 Manuscript status →              Editor Review → Under Review
```

**Created Database Records:**

```sql
-- 3 records in assign_reviewers
INSERT INTO assign_reviewers (manuscript_id, reviewer_id, assigned_by, deadline, status)

-- 3 records in reviews (initially status='Draft')
INSERT INTO reviews (assign_reviewer_id, manuscript_id, reviewer_id, status='Draft')
```

#### Step 3: Reviewers Complete Reviews

```
Reviewer Action                  System Response                  Manuscript Impact
─────────────────────────────────────────────────────────────────────────────
Receive email              →     Email with magic link

Click "Accept Review"      →     Update assignment status         assign_reviewers.status = 'accepted'

Download manuscript        →     Access manuscript files

Fill review form:          →     Update review record             reviews table updated
  - Originality: 4/5
  - Methodology: 5/5
  - Significance: 4/5
  - Clarity: 3/5
  - Language: 4/5
  - Comments to author
  - Confidential comments

Add line comments          →     Create comment records           review_comments table
Page 3, Line 12

Click "Submit Review"      →     reviews.status = 'Submitted'     One review completed
                                 assign_reviewers.status = 'completed'
                                 Email editor notification
```

#### Step 4: Editor Makes Recommendation

```
Once all 3 reviews are submitted:

Editor Action                    System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
View manuscript            →     See all 3 reviews                GET /api/v1/editor/manuscripts/:id

Read review summaries      →     Average scores calculated
Review 1: Accept
Review 2: Minor Revision
Review 3: Minor Revision

Make decision:             →     Store decision in manuscript     POST /api/v1/editor/manuscripts/:id/submit-to-eic
"Minor Revision"                 editor_final_decision = {
Add recommendation text           decision: "minor_revision",
                                  rationale: "...",
                                  recommendation: "..."
                                 }
                                 editor_submitted_to_eic = true

                                 Email EIC notification
```

---

### Scenario 3: EIC Makes Final Decision & Sends for Revision

#### Step 1: EIC Reviews Pending Manuscripts

```
EIC Action                       System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Login to dashboard         →     Show statistics                  GET /api/v1/eic/dashboard/stats
                                 - 5 pending decisions
                                 - 12 under review
                                 - 3 in revision

Click "Pending Decisions"  →     List manuscripts where           GET /api/v1/eic/manuscripts/pending
                                 editor_submitted_to_eic=true

Select manuscript          →     Full details + timeline          GET /api/v1/eic/manuscripts/:id
                                 - Author info
                                 - Editor recommendation
                                 - All 3 reviews
                                 - Assignment history
```

#### Step 2: Review Details

```
EIC Action                       System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Read editor decision       →     Display editor_final_decision    GET /api/v1/eic/manuscripts/:id/editor-decision
"Minor Revision recommended"

View all reviews           →     Display all review records       GET /api/v1/eic/manuscripts/:id/reviews
                                 - Review 1: Accept (scores, comments)
                                 - Review 2: Minor Revision
                                 - Review 3: Minor Revision

Download manuscript        →     Access files
Read thoroughly
```

#### Step 3: Make Final Decision

```
EIC Decision: "Minor Revision Required"

EIC Action                       System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Select decision:           →     Prepare decision form
"Minor Revision"

Write note to author       →     Store decision data              POST /api/v1/eic/manuscripts/:id/final-decision

Select visible comments:   →     Update manuscript:               Body: {
☑ Review 2 comments              - eic_decision = 'Minor Revision'  decision: "Minor Revision",
☑ Review 3 comments              - eic_decision_note = "..."         decision_note: "...",
☐ Review 1 (confidential)        - visible_comments_to_author = [    visible_comment_ids: [...],
                                     review2_id, review3_id           increase_reviewer_limit: 4
                                   ]                               }
                                 - eic_decision_date = NOW()
Increase reviewer limit    →     - max_reviewer_limit = 4
to 4 (from 3)                    - status = 'Revision Required'

Submit decision            →     Email author with:
                                 - Decision text
                                 - Link to visible comments
                                 - Instructions for revision
```

---

### Scenario 4: Author Submits Revision

#### Step 1: Author Receives Decision

```
Author Action                    System Response                  Manuscript State
─────────────────────────────────────────────────────────────────────────────
Receive email              →     "Revision required for           status = 'Revision Required'
                                  manuscript MS-2025-001"

Login, view manuscripts    →     Status shows "Revision Required" GET /api/v1/author/my-manuscripts/get-all-my-manuscripts

Click manuscript           →     View details                     GET /api/v1/author/manuscripts/:id/visible-reviews

Click "View Reviews"       →     Display only visible reviews:    Returns review2 and review3
                                 - Review 2 text                  (Review 1 is hidden by EIC)
                                 - Review 3 text
                                 - EIC decision note
```

#### Step 2: Prepare Revision

```
Author works offline to revise the manuscript based on feedback.
```

#### Step 3: Submit Revision

```
Author Action                    System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Click "Submit Revision"    →     Upload form appears              POST /api/v1/author/manuscripts/:id/submit-revision

Upload revised DOCX        →     Upload to R2 storage             multipart/form-data:
Upload new cover letter          Store in manuscript_versions     - main_file
Optional: add supplementary      - main_file (original DOCX)      - cover_letter
                                 - main_file_pdf (auto-converted) - supplementary_files

Write response to          →     Store in manuscript_versions     Stores in author_response field
reviewers explaining              .author_response
changes

Click "Submit"             →     - Increment manuscript.version   version: 1 → 2
                                   (1 → 2)                         status: 'Revision Required' → 'Submitted'
                                 - Create manuscript_version
                                   record
                                 - Change status back to
                                   'Submitted'
                                 - Email editor notification
```

**Created Database Records:**

```sql
-- Update manuscripts
UPDATE manuscripts
SET version = 2, status = 'Submitted', updated_at = NOW()
WHERE id = '...';

-- Insert new version record
INSERT INTO manuscript_versions (
  manuscript_id,
  version_number,
  main_file,
  author_response,
  created_at
) VALUES (
  '...',
  2.0,
  {...},
  'We have addressed all reviewer comments...',
  NOW()
);
```

#### Step 4: Re-Review Process

```
Editor now sees manuscript again with version=2.
May assign same or different reviewers.
Process repeats until Accept or Reject decision.
```

---

### Scenario 5: Reviewer Invitation & Acceptance (For New Reviewers)

#### Step 1: Editor/Admin Invites Reviewer

```
Admin/Editor Action              System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Click "Invite Reviewer"    →     Show invitation form             POST /api/v1/invitations/reviewer-invite

Fill form:                 →     Create user record:              Body: {
  email: jane@uni.edu             - role = 'Reviewer'                email, first_name, last_name,
  name: Dr. Jane Smith            - is_active = false                assigned_category,
  category: Oncology              Create authentication_meta:        temp_password, expertise_areas
  expertise: cancer biology       - invitation_token (random)      }
  temp password: TempPass123      - invitation_token_expires_at
                                  - password_hash (temp password)
                                  Create reviewer record:
                                  - assigned_category = 'Oncology'
                                  - expertise_areas = [...]

Submit                     →     Send email with:
                                 - Invitation link with token
                                 - Temporary password
                                 - Instructions
```

#### Step 2: Reviewer Accepts Invitation

```
Reviewer Action                  System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Click link in email        →     Verify token                     POST /api/v1/invitations/reviewer-accept
                                                                   ?token=...

Token validated            →     - Mark user as active
                                   (is_active = true)
                                 - Clear invitation_token
                                 - Force password change on
                                   first login

Redirect to login          →     Frontend redirects               Response: {
                                                                     success: true,
                                                                     redirectUrl: "/login"
                                                                   }

Login with temp password   →     Authenticate                     POST /api/v1/auth/login

Prompted to change         →     Update password                  POST /api/v1/auth/change-password
password
```

#### Step 3: Reviewer Updates Profile

```
Reviewer Action                  System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Navigate to profile        →     Show profile form                GET /api/v1/reviewer/profile

Update:                    →     Update reviewer record           PUT /api/v1/reviewer/profile
  - Bio
  - Expertise areas
  - Languages
  - Upload profile image

Set preferences:           →     Update reviewer record           PUT /api/v1/reviewer/preferences
  - Max concurrent reviews: 3    - max_current_reviews = 3
  - Availability: Available      - availability_status = 'Available'
```

---

### Scenario 6: Issue Compilation & Publication

#### Step 1: Editor Creates Issue

```
Editor Action                    System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
View accepted manuscripts  →     Filter manuscripts               GET /api/v1/editor/manuscripts
                                 WHERE status = 'Accepted'         ?status=Accepted

Select manuscripts for     →     Note manuscript IDs
Volume 10, Issue 3

Click "Create Issue"       →     Show issue form                  POST /api/v1/editor/issues

Fill details:              →     Create issue record:             Body: {
  Volume: 10                     - volume_number = 10               volume_number, issue_number,
  Issue: 3                       - issue_number = 3                 manuscripts_ids,
  Manuscripts: [id1, id2...]     - manuscripts_ids = [...]          planned_publication_date,
  Pub date: 2026-04-01           - status = 'Draft'                 issue_title, description,
  Title: "Spring 2026"           Generate DOI                       ...
                                                                   }
Submit                     →     Save issue
                                 Email EIC for approval
```

#### Step 2: EIC Reviews & Publishes

```
EIC Action                       System Response                  Manuscript Updates
─────────────────────────────────────────────────────────────────────────────
Review issue details       →     Display issue                    GET /api/v1/editor/issues/:id

Verify metadata            →     Check all fields complete        metadata_validated = true
Verify copyright           →     Check agreements signed          copyright_agreement_completed = true
Verify final files         →     Check PDF versions exist         final_files_received = true

Click "Publish Issue"      →     - issue.status = 'Published'     For each manuscript in issue:
                                 - issue.published_at = NOW()     - status = 'Published'
                                 - Assign final DOIs

                                 Email all authors with
                                 publication links
```

#### Step 3: Export Metadata

```
Editor Action                    System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Click "Download Metadata"  →     Generate JSON file               GET /api/v1/editor/issues/:id/download-metadata

File contains:             →     {
                                   "volume": 10,
                                   "issue": 3,
                                   "doi": "10.xxxx/issue.xxx",
                                   "manuscripts": [
                                     {
                                       "title": "...",
                                       "authors": [...],
                                       "doi": "10.xxxx/ms.xxx",
                                       "pages": "1-15"
                                     }
                                   ]
                                 }
```

---

### Scenario 7: Support Ticket Workflow

#### Step 1: Reviewer Raises Ticket

```
Reviewer Action                  System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Navigate to "Support"      →     Show ticket form                 POST /api/v1/reviewer/support-tickets

Fill form:                 →     Create support_ticket:           Body: {
  Category: Technical            - reviewer_id = current_user       subject,
  Subject: "Cannot download MS"  - category = 'Technical'           message,
  Description: "Error 404..."    - subject = "..."                  manuscript_id (optional)
  Attach screenshot              - description = "..."            }
                                 - attachment = JSON
                                 - status = 'open'

Submit                     →     Email admin team
                                 Return ticket ID
```

#### Step 2: Admin Responds

```
Admin Action                     System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
View all tickets           →     List all tickets                 GET /api/v1/admin/support-tickets
                                 Filter by status = 'open'         ?status=open

Click ticket               →     Show ticket details              GET /api/v1/admin/support-tickets/:id

Investigate issue          →     (Admin checks logs, etc.)

Write response:            →     Update ticket:                   PATCH /api/v1/admin/support-tickets/:id
"The manuscript link has         - status = 'in_progress'
been fixed. Please try again."   - admin_response = "..."         Body: {
                                 - admin_id = current_admin         status: 'in_progress',
                                                                     admin_response: "..."
Submit                     →     Email reviewer with response     }
```

#### Step 3: Close Ticket

```
Admin verifies issue is resolved.

Admin Action                     System Response                  API Endpoint
─────────────────────────────────────────────────────────────────────────────
Click "Close Ticket"       →     Update ticket:                   PATCH /api/v1/admin/support-tickets/:id
                                 - status = 'closed'
                                 - resolved_at = NOW()            Body: {
                                                                     status: 'closed'
                                 Email reviewer                   }
```

---

## API Summary by Role

### Author APIs

| Method | Endpoint                                               | Purpose               |
| ------ | ------------------------------------------------------ | --------------------- |
| POST   | `/api/v1/auth/register/step-1`                         | Initial registration  |
| POST   | `/api/v1/auth/register/verify-otp`                     | Verify email OTP      |
| POST   | `/api/v1/auth/register/finalize`                       | Complete registration |
| POST   | `/api/v1/auth/login`                                   | Login                 |
| POST   | `/api/v1/auth/logout`                                  | Logout                |
| POST   | `/api/v1/auth/refresh-tokens`                          | Refresh access token  |
| GET    | `/api/v1/auth/me`                                      | Get current user      |
| POST   | `/api/v1/author/my-manuscripts/draft`                  | Create draft          |
| PUT    | `/api/v1/author/my-manuscripts/:id/details`            | Update manuscript     |
| PUT    | `/api/v1/author/my-manuscripts/:id/files`              | Upload files          |
| PUT    | `/api/v1/author/my-manuscripts/:id/submit`             | Submit manuscript     |
| GET    | `/api/v1/author/my-manuscripts/get-all-my-manuscripts` | List manuscripts      |
| GET    | `/api/v1/author/manuscripts/:id/visible-reviews`       | View reviews          |
| POST   | `/api/v1/author/manuscripts/:id/submit-revision`       | Submit revision       |
| GET    | `/api/v1/author/profile`                               | Get profile           |
| PUT    | `/api/v1/author/update-profile`                        | Update profile        |
| GET    | `/api/v1/author/billing`                               | Get billing info      |
| PUT    | `/api/v1/author/billing`                               | Update billing        |

### Reviewer APIs

| Method | Endpoint                                   | Purpose            |
| ------ | ------------------------------------------ | ------------------ |
| GET    | `/api/v1/reviewer/assignments`             | List assignments   |
| PUT    | `/api/v1/reviewer/assignments/:id/accept`  | Accept review      |
| PUT    | `/api/v1/reviewer/assignments/:id/reject`  | Reject review      |
| GET    | `/api/v1/reviewer/assignment/:assignId`    | Get review details |
| PUT    | `/api/v1/reviewer/review/:reviewId`        | Update scores      |
| PUT    | `/api/v1/reviewer/review/:reviewId/submit` | Submit review      |
| GET    | `/api/v1/reviewer/:reviewId/comments`      | Get comments       |
| POST   | `/api/v1/reviewer/:reviewId/comments`      | Add comment        |
| PUT    | `/api/v1/reviewer/comment/:id`             | Update comment     |
| DELETE | `/api/v1/reviewer/comment/:id`             | Delete comment     |
| GET    | `/api/v1/reviewer/profile`                 | Get profile        |
| PUT    | `/api/v1/reviewer/profile`                 | Update profile     |
| GET    | `/api/v1/reviewer/preferences`             | Get preferences    |
| PUT    | `/api/v1/reviewer/preferences`             | Update preferences |
| POST   | `/api/v1/reviewer/support-tickets`         | Raise ticket       |

### Editor APIs

| Method | Endpoint                                       | Purpose                     |
| ------ | ---------------------------------------------- | --------------------------- |
| GET    | `/api/v1/editor/manuscripts`                   | List manuscripts (category) |
| GET    | `/api/v1/editor/manuscripts/:id`               | Get manuscript              |
| GET    | `/api/v1/editor/reviewers`                     | List reviewers (category)   |
| GET    | `/api/v1/editor/reviewers/:id`                 | Get reviewer                |
| POST   | `/api/v1/editor/assignments/single`            | Assign one reviewer         |
| POST   | `/api/v1/editor/assignments/bulk`              | Assign multiple reviewers   |
| POST   | `/api/v1/editor/manuscripts/:id/submit-to-eic` | Submit to EIC               |
| POST   | `/api/v1/editor/issues`                        | Create issue                |
| GET    | `/api/v1/editor/issues/:id/download-metadata`  | Export metadata             |

### EIC APIs

| Method | Endpoint                                      | Purpose            |
| ------ | --------------------------------------------- | ------------------ |
| GET    | `/api/v1/eic/dashboard/stats`                 | Dashboard stats    |
| GET    | `/api/v1/eic/manuscripts/pending`             | Pending decisions  |
| GET    | `/api/v1/eic/manuscripts`                     | All manuscripts    |
| GET    | `/api/v1/eic/manuscripts/:id`                 | Manuscript details |
| GET    | `/api/v1/eic/manuscripts/:id/reviews`         | All reviews        |
| GET    | `/api/v1/eic/manuscripts/:id/editor-decision` | Editor decision    |
| POST   | `/api/v1/eic/manuscripts/:id/final-decision`  | Make decision      |
| POST   | `/api/v1/eic/manuscripts/:id/send-revision`   | Send for revision  |
| PUT    | `/api/v1/eic/manuscripts/:id/reviewer-limit`  | Update limit       |
| GET    | `/api/v1/eic/reviewers`                       | All reviewers      |
| GET    | `/api/v1/eic/manuscripts/:id/audit-trail`     | Audit trail        |

### Admin APIs

| Method | Endpoint                             | Purpose         |
| ------ | ------------------------------------ | --------------- |
| GET    | `/api/v1/admin/support-tickets`      | All tickets     |
| PATCH  | `/api/v1/admin/support-tickets/:id`  | Update ticket   |
| PATCH  | `/api/v1/admin/users/:id/deactivate` | Deactivate user |
| PATCH  | `/api/v1/admin/users/:id/reactivate` | Reactivate user |

### Invitation APIs (Admin/Editor/EIC)

| Method | Endpoint                              | Purpose              |
| ------ | ------------------------------------- | -------------------- |
| POST   | `/api/v1/invitations/reviewer-invite` | Invite reviewer      |
| POST   | `/api/v1/invitations/reviewer-resend` | Resend invitation    |
| GET    | `/api/v1/invitations/status`          | List invitations     |
| POST   | `/api/v1/invitations/reviewer-accept` | Accept (public)      |
| POST   | `/api/v1/invitations/editor-invite`   | Invite editor        |
| POST   | `/api/v1/invitations/editor-resend`   | Resend editor invite |
| POST   | `/api/v1/invitations/editor-accept`   | Accept editor invite |

---

## State Transitions

### Manuscript Status Flow

```
                    ┌──────────────┐
                    │    Draft     │ (Author creating)
                    └──────┬───────┘
                           │ author submits
                           ▼
                    ┌──────────────┐
                    │  Submitted   │ (Awaiting editor)
                    └──────┬───────┘
                           │ editor receives
                           ▼
                    ┌──────────────┐
                    │Editor Review │ (Editor reviewing, assigning reviewers)
                    └──────┬───────┘
                           │ reviewers assigned
                           ▼
                    ┌──────────────┐
                    │ Under Review │ (Reviewers working)
                    └──────┬───────┘
                           │ all reviews submitted + editor makes decision
                           ▼
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    ┌─────────────────┐         ┌──────────────┐
    │Editor submits   │         │ Editor might │
    │to EIC           │         │  continue    │
    └────────┬────────┘         └──────────────┘
             │ EIC reviews
             ▼
    ┌────────────────────────────────────┐
    │  EIC Makes Final Decision          │
    └┬──────────┬──────────┬─────────────┘
     │          │          │
     ▼          ▼          ▼
┌─────────┐ ┌──────────────────┐ ┌──────────┐
│ Accept  │ │Revision Required │ │ Rejected │
└────┬────┘ └────────┬─────────┘ └──────────┘
     │               │                (End)
     │               │ author submits revision
     │               ▼
     │        ┌──────────────┐
     │        │  Submitted   │ (Re-review cycle)
     │        └──────┬───────┘
     │               │ repeats review process
     │               │
     │               ▼
     │        (Back to Under Review)
     │
     ▼
┌─────────────┐
│  Accepted   │ (Ready for issue)
└─────┬───────┘
      │ added to issue & issue published
      ▼
┌─────────────┐
│  Published  │ (Final state)
└─────────────┘
```

### Assignment Status Flow (Reviewer Assignment)

```
┌──────────┐
│ assigned │ (Editor assigns reviewer)
└────┬─────┘
     │
     ├────────────┬────────────┐
     │            │            │
     ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌────────────┐
│ accepted │ │ rejected │ │ (timeout)  │
└────┬─────┘ └──────────┘ └────────────┘
     │          (End)         (Editor reassigns)
     ▼
┌───────────┐
│ in_review │ (Reviewer working)
└─────┬─────┘
      │ reviewer submits review
      ▼
┌───────────┐
│ completed │ (Review done)
└───────────┘
```

### Review Status Flow

```
┌───────┐
│ Draft │ (Review created, reviewer filling form)
└───┬───┘
    │ reviewer clicks "Submit Review"
    ▼
┌───────────┐
│ Submitted │ (Review complete, visible to editor/EIC)
└───────────┘
```

### Support Ticket Status Flow

```
┌──────┐
│ open │ (Ticket created)
└───┬──┘
    │ admin starts working
    ▼
┌─────────────┐
│ in_progress │ (Admin investigating)
└──────┬──────┘
       │ admin resolves
       ▼
┌────────┐
│ closed │ (Ticket resolved)
└────────┘
```

### User Registration Flow

```
┌────────┐
│ Step 1 │ Email + Password → User created (inactive)
└───┬────┘
    │ OTP sent
    ▼
┌────────┐
│ Step 2 │ Verify OTP → Email verified
└───┬────┘
    │ email_verified = true
    ▼
┌────────┐
│ Step 3 │ Profile + Academic → Registration complete
└───┬────┘
    │ is_active = true, registration_step = 'completed'
    ▼
┌───────────┐
│ Completed │ User can login
└───────────┘
```

---

## Key Business Rules

### Manuscript Rules

1. **Category-based routing**: Each manuscript has ONE category. Routed to editor with matching assigned_category.
2. **Version control**: Version increments when revision is submitted. Original files preserved in manuscript_versions.
3. **Reviewer limit**: Default 3, EIC can increase. Prevents too many conflicting reviews.
4. **File requirements**: Main file (DOCX) and cover letter required before submission.
5. **Immutability**: Once submitted, author cannot edit. Only way to change is through revision process.

### Reviewer Rules

1. **Category matching**: Reviewers only see manuscripts in their assigned_category.
2. **Workload management**: max_current_reviews limits concurrent assignments.
3. **Availability**: Editors can filter by availability_status.
4. **Anonymity**: Review comments can be anonymous (system doesn't expose reviewer identity to author by default).
5. **Deadline enforcement**: Assignments have deadlines (tracked but not auto-enforced).

### Editor Rules

1. **One category per editor**: Each editor has unique assigned_category. No overlaps.
2. **Cannot make final decision**: Editors recommend, EIC decides.
3. **Reviewer assignment**: Can only assign reviewers from same category.
4. **Bulk operations**: Can assign multiple reviewers at once with same deadline.

### EIC Rules

1. **Final authority**: Only EIC can change manuscript to Accepted/Rejected.
2. **Comment visibility**: EIC chooses which review comments authors see.
3. **Override capability**: Can increase reviewer limits.
4. **Cross-category access**: Can see all manuscripts regardless of category.

### Admin Rules

1. **No self-deactivation**: Admins cannot deactivate their own accounts.
2. **Support only**: Cannot make editorial decisions.
3. **User management**: Can deactivate/reactivate any user.

---

## Security & Authentication

### Authentication Flow

1. **Access Token**: JWT, short-lived (15 minutes), sent in response body.
2. **Refresh Token**: JWT, long-lived (7 days), stored in HTTP-only cookie.
3. **Token Rotation**: Each refresh generates new refresh token (old one invalidated).
4. **OTP**: 6-digit, 10-minute expiration, max 5 attempts.
5. **Magic Link**: One-time use, 15-minute expiration.
6. **Invitation**: Token-based, 7-day expiration.

### Authorization Middleware

- All protected routes require valid access token in `Authorization: Bearer <token>` header.
- Role-based access control (RBAC) enforced via middleware.
- Each role has access only to their designated endpoints.

---

## File Storage

### R2 Storage (Cloudflare)

All uploaded files stored in R2 buckets.

**File Types:**

- **Main manuscript**: DOCX only (validated)
- **Cover letter**: PDF/DOCX
- **Supplementary**: Various formats
- **Profile images**: Image formats (JPEG, PNG)
- **Issue covers**: Image formats

**Metadata Storage:**
Stored as JSONB in database:

```json
{
  "key": "manuscripts/uuid/main_v1.docx",
  "originalName": "research_paper.docx",
  "size": 1048576,
  "mimetype": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "uploadedAt": "2026-02-17T10:30:00Z",
  "url": "https://r2.example.com/..."
}
```

---

## Notification System

### Email Triggers

| Event                     | Recipient            | Content                         |
| ------------------------- | -------------------- | ------------------------------- |
| OTP sent                  | Author (new)         | 6-digit code                    |
| Registration complete     | Author               | Welcome message                 |
| Manuscript submitted      | Editor               | New submission alert            |
| Reviewer assigned         | Reviewer             | Assignment details + deadline   |
| Review submitted          | Editor               | Review completion notice        |
| Editor decision submitted | EIC                  | Pending decision alert          |
| Final decision made       | Author               | Decision + visible comments     |
| Revision uploaded         | Editor               | Revision notification           |
| Issue published           | All authors in issue | Publication confirmation        |
| Invitation                | Reviewer/Editor      | Invitation link + temp password |
| Support ticket created    | Admin                | Ticket details                  |
| Support ticket responded  | Reviewer             | Response notification           |

---

## Summary

This system provides a complete workflow for academic journal management:

1. **Authors** submit manuscripts, respond to revisions
2. **Reviewers** evaluate manuscripts, provide expert feedback
3. **Editors** coordinate peer review within their specialty
4. **EIC** makes publication decisions, oversees quality
5. **Admins** manage users and support

The database schema supports version control, audit trails, role-based access, and flexible assignment workflows. APIs are RESTful and role-specific, ensuring proper authorization at every step.
