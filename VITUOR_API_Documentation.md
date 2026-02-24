# VITUOR Academic Journal Management System - API Documentation

## Overview
This document provides a comprehensive guide to all API endpoints in the VITUOR system, organized by user role. Each endpoint includes a detailed explanation in plain English, technical implementation details, required fields, and expected responses.

---

## Table of Contents
1. [Authentication APIs](#authentication-apis)
2. [Admin APIs](#admin-apis)
3. [Author APIs](#author-apis)
4. [Editor APIs](#editor-apis)
5. [Editor-in-Chief (EIC) APIs](#editor-in-chief-eic-apis)
6. [Reviewer APIs](#reviewer-apis)
7. [Invitation APIs](#invitation-apis)
8. [Support APIs](#support-apis)

---

## Authentication APIs
**Base Route**: `/api/v1/auth`

These APIs handle user authentication, registration, and account management across all user types.

### 1. **Login with Email & Password**
- **Endpoint**: `POST /login`
- **What it does**: Allows users to log into the system using their email and password credentials
- **How it works**: Validates the email/password combination, generates JWT access and refresh tokens, stores the refresh token securely in a browser cookie
- **Required Fields**:
  - `email` (string): User's registered email address
  - `password` (string): User's password
- **Technical Details**: 
  - Uses bcrypt for password hashing/verification
  - Implements JWT tokens with access token (short-lived) and refresh token (longer-lived)
  - Stores hashed refresh token in database to enforce single active session
  - Sets HttpOnly secure cookie for refresh token
- **Response**: User profile data + JWT access token

### 2. **Magic Link Authentication**
- **Request Endpoint**: `POST /magic-link/request`
- **Verify Endpoint**: `GET /magic-link/verify?token=xxx`
- **What it does**: Provides passwordless login through email links - users receive a secure link in their email that logs them in automatically
- **How it works**: 
  1. User requests magic link with their email
  2. System generates a cryptographically secure token with expiration
  3. Token is stored in database and emailed to user
  4. User clicks link, system validates token and logs them in
- **Required Fields (Request)**:
  - `email` (string): User's registered email address
- **Technical Details**:
  - Generates 32-byte random hex tokens using crypto module
  - Tokens expire after a set time period (configurable)
  - Security measure: Always returns success message even for non-existent emails (prevents email enumeration attacks)
  - Overwrites previous magic tokens when new ones are requested

### 3. **OAuth Authentication (ORCID & Google)**
- **ORCID Endpoint**: `GET /orcid` → `GET /orcid/callback`
- **Google Endpoint**: `GET /google` → `GET /google/callback`
- **What it does**: Allows users to authenticate using their academic ORCID account or Google account
- **How it works**: Uses OAuth 2.0 flow - redirects to external provider, user authorizes, system receives user data and creates/links account
- **Technical Details**:
  - Implements Passport.js OAuth strategies
  - ORCID provides academic identity verification
  - Google provides convenient social login
  - Links external account data to user profiles

### 4. **Token Refresh**
- **Endpoint**: `POST /refresh-tokens`
- **What it does**: Refreshes expired access tokens without requiring user to log in again
- **How it works**: Uses the refresh token from the secure cookie to generate a new access token
- **Technical Details**: 
  - Validates refresh token against database
  - Checks expiration dates
  - Generates new access token while keeping refresh token active

### 5. **Password Management**
- **Forgot Password**: `POST /forgot-password`
- **Reset Password**: `POST /reset-password`  
- **Change Password**: `POST /change-password` (requires auth)
- **What it does**: Handles password recovery when users forget their credentials, and allows password changes for logged-in users
- **How it works**: 
  - Forgot: Generates secure reset token, emails to user
  - Reset: Validates token and updates password
  - Change: Requires current password verification before setting new one

### 6. **User Profile**
- **Get Current User**: `GET /me` (requires auth)
- **Logout**: `POST /logout` (requires auth)
- **What it does**: Retrieves current user information and handles secure logout
- **How it works**: Uses JWT token to identify user, invalidates tokens on logout

---

## Admin APIs
**Base Route**: `/api/v1/admin`
**Required Role**: Admin

Administrators have system-wide access to manage users, support tickets, and platform operations.

### 1. **Support Ticket Management**

#### **View All Support Tickets**
- **Endpoint**: `GET /support-tickets`
- **What it does**: Displays a paginated list of all support tickets submitted by users across the platform
- **How it works**: Retrieves tickets from database with pagination, filtering by status, includes related manuscript and admin data
- **Query Parameters**:
  - `page` (number, default: 1): Page number for pagination
  - `limit` (number, default: 10): Number of tickets per page
  - `status` (string, optional): Filter by ticket status (open, in-progress, closed)
- **Technical Details**: 
  - Uses Sequelize ORM with include statements for related data
  - Orders by creation date (newest first)
  - Returns total count for pagination calculation
- **Response**: Paginated list of tickets with associated manuscript and admin information

#### **View Single Support Ticket**
- **Endpoint**: `GET /support-tickets/:id`
- **What it does**: Shows detailed information about a specific support ticket including all related data
- **Required Parameters**: 
  - `id` (string): Unique ticket identifier
- **How it works**: Fetches ticket by ID with all related data using database joins

#### **Update Support Ticket**
- **Endpoint**: `PATCH /support-tickets/:id`
- **What it does**: Allows admins to update ticket status, add responses, and mark tickets as resolved
- **Required Fields**:
  - `status` (string, optional): New ticket status (open, in-progress, closed)
  - `admin_response` (string, optional): Admin's response to the user
- **How it works**: 
  - Updates ticket in database
  - Automatically sets resolved timestamp when status changed to 'closed'
  - Associates admin ID with the ticket for accountability
- **Technical Details**: 
  - Validates that ticket exists before updating
  - Tracks which admin handled the ticket
  - Auto-timestamps resolution when closed

### 2. **User Management**

#### **Deactivate User Account**
- **Endpoint**: `PATCH /users/:id/deactivate`
- **What it does**: Safely disables a user account, preventing login while preserving data for audit purposes
- **Required Fields**:
  - `reason` (string, optional): Reason for deactivation
- **How it works**: 
  - Sets user status to inactive
  - Records deactivation timestamp and reason
  - Prevents admin from deactivating their own account (safety check)
- **Technical Details**:
  - Preserves all user data for potential reactivation
  - Maintains audit trail of administrative actions
  - Blocks login attempts for deactivated users

#### **Reactivate User Account**
- **Endpoint**: `PATCH /users/:id/reactivate`
- **What it does**: Restores access to a previously deactivated user account
- **How it works**: 
  - Sets user status back to active
  - Clears deactivation timestamp and reason
  - Restores full platform access
- **Technical Details**: Reverses deactivation process completely

---

## Author APIs
**Base Route**: `/api/v1/author`
**Required Role**: Author

Authors can manage their academic profiles, submit manuscripts, and track publication progress.

### 1. **Profile Management**

#### **Get Author Profile**
- **Endpoint**: `GET /profile`
- **What it does**: Retrieves complete author profile including personal information, academic credentials, and publication metrics
- **How it works**: Joins User and Author tables to compile comprehensive profile data
- **Response Includes**:
  - Personal info (name, email, contact)
  - Academic IDs (ORCID, Google Scholar, Student ID)
  - Institution and department details
  - Publication metrics (total publications, citations, h-index)
  - Profile image if uploaded
- **Technical Details**:
  - Prioritizes academic IDs in order: ORCID → Google Scholar → Student ID
  - Returns profile image as JSON object with URL and metadata
  - Masks sensitive data while preserving necessary information

#### **Update Author Profile**
- **Endpoint**: `PUT /update-profile`
- **What it does**: Updates author's personal and professional information, including profile image upload
- **Required Fields** (all optional):
  - `prefix` (string): Title (Dr., Prof., Mr., Ms.)
  - `first_name`, `last_name` (string): Personal name
  - `phone` (string): Contact number
  - `institution` (string): Academic/research institution
  - `department` (string): Department or faculty
  - `country` (string): Country/region
  - `billing_name`, `billing_address` (string): For invoicing
  - `invoice_email` (string): Email for financial communications
  - `tax_id` (string): Tax identification number
- **File Upload**: 
  - `profile_image` (file): Image file for profile picture
- **How it works**: 
  - Updates User table for basic info
  - Updates Author table for academic-specific data
  - Handles file upload to cloud storage (Cloudflare R2)
  - Replaces old profile images when new ones are uploaded
- **Technical Details**:
  - Uses multer middleware for file handling
  - Stores images in cloud storage with unique keys
  - Maintains image metadata in database as JSON
  - Automatically deletes old images when replaced

#### **Delete Profile Image**
- **Endpoint**: `DELETE /delete-image`
- **What it does**: Removes the author's profile image without affecting other profile data
- **How it works**: 
  - Deletes image file from cloud storage
  - Sets profile_image field to null in database
- **Technical Details**: Dedicated endpoint for image-only operations

#### **Get Billing Profile**
- **Endpoint**: `GET /billing`
- **What it does**: Retrieves financial and institutional information needed for invoicing and payment processing
- **Response Includes**:
  - Billing name and address
  - Institution and country for tax purposes
  - Invoice email address
  - Tax identification number
- **How it works**: Fetches billing-specific fields from Author table

#### **Update Billing Profile**
- **Endpoint**: `PUT /billing`
- **What it does**: Updates financial information for publication fees and invoicing
- **How it works**: Updates only billing-related fields in Author table

### 2. **Manuscript Management**

Authors can submit manuscripts through a multi-step process: Draft Creation → Author Information → File Upload → Review & Submit.

#### **Create Manuscript Draft**
- **Endpoint**: `POST /my-manuscripts/draft`
- **What it does**: Creates a new manuscript submission in draft status to begin the submission process
- **Required Fields**:
  - `author_id` (string): ID of the submitting author
  - `title` (string): Manuscript title
  - `abstract` (text): Research abstract
  - `keywords` (array): Research keywords
  - `category` (string): Subject category (Medicine, Oncology, etc.)
  - `manuscript_type` (string): Type of submission (research, review, case study)
- **How it works**: Creates database record with 'Draft' status, allows incremental completion
- **Technical Details**: 
  - Sets initial status to prevent accidental submission
  - Generates unique manuscript ID for tracking

#### **Update Manuscript Details**
- **Endpoint**: `PUT /my-manuscripts/:id/details`
- **What it does**: Modifies manuscript information after initial creation
- **How it works**: Updates manuscript record with new information provided in request body

#### **Update Author Information**
- **Endpoint**: `PUT /my-manuscripts/:id/authors`
- **What it does**: Adds co-authors and contributor information to the manuscript
- **Required Fields**:
  - `authors` (array): List of all authors including names, affiliations, contributions
- **How it works**: Stores author list as structured data in manuscript record

#### **Upload Manuscript Files**
- **Endpoint**: `PUT /my-manuscripts/:id/files`
- **What it does**: Handles upload of required manuscript documents including main file, cover letter, and supplementary materials
- **File Fields**:
  - `main_file` (file): Main manuscript document (required)
  - `cover_letter` (file): Cover letter (required)
  - `supplementary_files` (files): Additional materials (optional, up to 10 files)
- **How it works**: 
  - Uploads files to cloud storage with organized folder structure
  - Stores file metadata and URLs in manuscript record
  - Validates file types and sizes
- **Technical Details**:
  - Uses multer for multi-file handling
  - Cloudflare R2 for reliable file storage
  - Organizes files by type (manuscripts/, coverLetters/, supplementary/)
  - Preserves original filenames and metadata

#### **Delete Manuscript File**
- **Endpoint**: `DELETE /my-manuscripts/:id/file`
- **What it does**: Removes uploaded files during the editing process
- **Required Fields**:
  - `key` (string): File storage key for identification
  - `type` (string): File type (main, cover, supplementary)
- **How it works**: 
  - Deletes file from cloud storage
  - Updates manuscript record to remove file references
  - Handles different file types appropriately

#### **Submit Manuscript**
- **Endpoint**: `PUT /my-manuscripts/:id/submit`
- **What it does**: Finalizes manuscript submission and sends it into the peer review workflow
- **How it works**: 
  - Validates that required files are present
  - Changes status from 'Draft' to 'Submitted'
  - Makes manuscript available to editorial team
- **Technical Details**:
  - Pre-submission validation ensures completeness
  - Status change triggers editorial workflow
  - Irreversible action - creates permanent submission record

#### **Get My Manuscripts**
- **Endpoint**: `GET /my-manuscripts` (route inferred from controller)
- **What it does**: Displays paginated list of all manuscripts submitted by the author
- **Query Parameters**:
  - `page`, `limit`: Pagination controls
  - `status`: Filter by manuscript status
  - `search`: Search in title and manuscript ID
  - `sort`, `order`: Sorting options
- **How it works**: Retrieves author's manuscripts with filtering and pagination
- **Technical Details**: Uses database queries with search and filter conditions

#### **Get Single Manuscript**
- **Endpoint**: `GET /my-manuscripts/:id` (route inferred)
- **What it does**: Shows detailed information about a specific manuscript
- **How it works**: Fetches complete manuscript data including files and metadata

### 3. **Account Management**

#### **Deactivate Own Account**
- **Endpoint**: `PUT /deactivate`
- **What it does**: Allows authors to deactivate their own accounts
- **How it works**: Similar to admin deactivation but initiated by the user themselves

---

## Editor APIs
**Base Route**: `/api/v1/editor`
**Required Role**: Editor

Editors manage manuscripts in their assigned categories, coordinate peer review, and prepare publications.

### 1. **Manuscript Management**

#### **Get Assigned Manuscripts**
- **Endpoint**: `GET /manuscripts`
- **What it does**: Displays all manuscripts assigned to the editor's category (e.g., Medicine, Oncology) with advanced filtering and search capabilities
- **Query Parameters**:
  - `search` (string): Search in title and abstract
  - `status` (string): Filter by manuscript status
  - `manuscript_type` (string): Filter by submission type
  - `page`, `limit`: Pagination controls
- **How it works**: 
  - Identifies editor's assigned category from their profile
  - Retrieves only manuscripts in that category
  - Applies search and filtering logic
- **Technical Details**:
  - Uses Sequelize ORM with complex where clauses
  - Case-insensitive search using iLike operator
  - Automatic pagination with total counts
- **Response**: Paginated list with manuscript details and metadata

#### **Get Manuscript Details**
- **Endpoint**: `GET /manuscripts/:id`
- **What it does**: Provides comprehensive view of a specific manuscript including all submission data, files, and current status
- **Required Parameters**: 
  - `id` (string): Manuscript unique identifier
- **How it works**: Fetches complete manuscript record with all associated data
- **Response Includes**:
  - Full manuscript content and metadata
  - Author information and files
  - Current review status
  - Assignment history

### 2. **Reviewer Management**

#### **Get Available Reviewers**
- **Endpoint**: `GET /reviewers`
- **What it does**: Shows reviewers available for assignment, filtered by the editor's category specialty
- **Query Parameters**:
  - `search` (string): Search by expertise or category
  - `availability` (string): Filter by availability status
  - `page`, `limit`: Pagination controls
- **How it works**: 
  - Filters reviewers by editor's assigned category
  - Shows only reviewers with matching specialties
  - Indicates current availability status
- **Technical Details**:
  - Uses array overlap search for specialty matching
  - Includes reviewer capacity and current workload
  - Real-time availability checking

#### **Get Reviewer Profile**
- **Endpoint**: `GET /reviewers/:id`
- **What it does**: Displays detailed information about a specific reviewer including expertise, availability, and performance metrics
- **Required Parameters**: 
  - `id` (string): Reviewer unique identifier
- **Response Includes**:
  - Professional background and expertise areas
  - Current availability and maximum review capacity
  - Performance history and ratings
  - Contact information for assignment

#### **Assign Single Reviewer**
- **Endpoint**: `POST /assignments/single`
- **What it does**: Assigns one reviewer to a specific manuscript for peer review
- **Required Fields**:
  - `manuscript_id` (string): Manuscript to be reviewed
  - `reviewer_id` (string): Selected reviewer
  - Additional assignment parameters (deadline, priority, etc.)
- **How it works**: 
  - Creates assignment record in database
  - Updates reviewer's workload count
  - Sends notification to reviewer
- **Technical Details**:
  - Validates reviewer availability and capacity
  - Creates assignment with pending status
  - Triggers email notification workflow

#### **Assign Multiple Reviewers**
- **Endpoint**: `POST /assignments/bulk`
- **What it does**: Assigns multiple reviewers to one manuscript simultaneously for comprehensive peer review
- **Required Fields**:
  - `manuscript_id` (string): Target manuscript
  - `reviewer_ids` (array): List of selected reviewers
- **How it works**: 
  - Creates multiple assignment records in batch
  - Validates all reviewers before processing
  - Sends notifications to all assigned reviewers
- **Technical Details**: Uses database transactions to ensure all assignments succeed or fail together

### 3. **Editorial Decision Making**

#### **Submit to Editor-in-Chief**
- **Endpoint**: `POST /manuscripts/:id/submit-to-eic`
- **What it does**: Forwards a manuscript with editorial recommendation to the Editor-in-Chief for final decision
- **How it works**: 
  - Compiles all review data and editorial assessment
  - Changes manuscript status to indicate EIC review needed
  - Transfers decision authority to Editor-in-Chief
- **Technical Details**:
  - Validates that all required reviews are completed
  - Sets editor_submitted_to_eic flag in database
  - Preserves complete audit trail of editorial process

### 4. **Publication Management**

#### **Create Journal Issue**
- **Endpoint**: `POST /issues`
- **What it does**: Creates a new journal issue for publication, collecting accepted manuscripts into a cohesive publication unit
- **Required Fields**:
  - `volume_number` (number): Journal volume
  - `issue_number` (number): Issue within volume
  - `planned_publication_date` (date): Target publication date
  - `issue_title` (string): Issue title or theme
  - `description` (text): Issue description
  - `manuscripts_ids` (array): Included manuscripts
  - `final_files_received` (boolean): File completion status
  - `copyright_agreement_completed` (boolean): Legal clearance status
  - `metadata_validated` (boolean): Data validation status
- **How it works**: 
  - Creates issue record with all included manuscripts
  - Tracks completion status of publication requirements
  - Manages publication workflow stages
- **Technical Details**:
  - Links manuscripts to issue for organization
  - Tracks publication readiness indicators
  - Supports issue-level metadata management

#### **Download Issue Metadata**
- **Endpoint**: `GET /issues/:id/download-metadata`
- **What it does**: Generates downloadable metadata file for journal issue, containing all bibliographic and technical information
- **Required Parameters**: 
  - `id` (string): Issue identifier
- **How it works**: 
  - Compiles all issue and manuscript metadata
  - Formats as structured JSON file
  - Provides download with appropriate headers
- **Technical Details**:
  - Sets proper MIME type for JSON download
  - Includes complete bibliographic information
  - Formatted for external systems integration

---

## Editor-in-Chief (EIC) APIs
**Base Route**: `/api/v1/eic`
**Required Role**: EditorInChief

Editor-in-Chief has oversight authority and makes final publication decisions on manuscripts.

### 1. **Manuscript Overview**

#### **Get Pending Manuscripts**
- **Endpoint**: `GET /manuscripts/pending`
- **What it does**: Shows manuscripts awaiting EIC decision after editor review completion
- **Query Parameters**:
  - `page`, `limit`: Pagination
  - `category`: Filter by subject area
  - `search`: Search in titles and IDs
  - `sort`, `order`: Sorting options
- **How it works**: 
  - Filters for manuscripts where editor_submitted_to_eic = true
  - Shows only manuscripts requiring EIC attention
  - Includes editor recommendations and review summaries
- **Technical Details**:
  - Complex query filtering for pending status
  - Includes related author and editor data
  - Orders by submission date priority

#### **Get All Manuscripts**
- **Endpoint**: `GET /manuscripts`
- **What it does**: Provides comprehensive view of all manuscripts in the system for oversight and management
- **Query Parameters**: Similar to pending manuscripts with additional status filtering
- **How it works**: 
  - Shows complete manuscript database with filtering
  - Enables system-wide oversight and reporting
  - Includes manuscripts at all stages of review

### 2. **Decision Review**

#### **Get Manuscript Details**
- **Endpoint**: `GET /manuscripts/:id`
- **What it does**: Displays complete manuscript information including all reviews, editor recommendations, and submission history
- **How it works**: 
  - Compiles comprehensive manuscript dossier
  - Includes all reviewer comments and scores
  - Shows editorial decision recommendations
  - Provides complete audit trail
- **Technical Details**:
  - Deep joins across multiple related tables
  - Includes review comments and scoring data
  - Complete assignment and decision history

#### **Get Manuscript Reviews**
- **Endpoint**: `GET /manuscripts/:id/reviews`
- **What it does**: Shows all peer review reports for a manuscript with reviewer identity and detailed feedback
- **How it works**: 
  - Retrieves all review records for manuscript
  - Includes reviewer information and credentials
  - Shows detailed scoring and comments
- **Response Includes**:
  - Reviewer qualifications and expertise
  - Detailed scoring across review criteria
  - Comments to authors and editors
  - Review submission dates and status

#### **Get Editor Decision**
- **Endpoint**: `GET /manuscripts/:id/editor-decision`
- **What it does**: Retrieves the handling editor's recommendation and reasoning for EIC consideration
- **How it works**: 
  - Shows editor's final recommendation
  - Includes supporting rationale
  - Provides handling editor information
- **Response Includes**:
  - Recommended decision (accept, revise, reject)
  - Editor's detailed reasoning
  - Handling editor credentials

### 3. **EIC Decision Making**

#### **Make Final Decision**
- **Endpoint**: `POST /manuscripts/:id/final-decision`
- **What it does**: Records the Editor-in-Chief's final publication decision on a manuscript
- **Required Fields**:
  - `decision` (string): Final decision (accept, major revision, minor revision, reject)
  - `decision_letter` (text): Detailed explanation to authors
  - `special_instructions` (text, optional): Additional guidance
- **How it works**: 
  - Records final decision in manuscript record
  - Generates decision letter for author notification
  - Updates manuscript status based on decision
  - Triggers appropriate workflow (publication or revision)
- **Technical Details**:
  - Creates permanent decision record
  - Updates manuscript status automatically
  - Generates author notification

#### **Send for Revision**
- **Endpoint**: `POST /manuscripts/:id/send-revision`
- **What it does**: Sends manuscript back to authors with revision requirements and reviewer feedback
- **Required Fields**:
  - `revision_type` (string): Major or minor revision
  - `deadline` (date): Revision submission deadline
  - `remarks` (text): EIC guidance for revision
- **How it works**: 
  - Updates manuscript status to revision required
  - Sets revision deadline and requirements
  - Notifies authors with reviewer feedback
- **Technical Details**:
  - Tracks revision cycles and deadlines
  - Maintains review history through revision process
  - Manages resubmission workflow

### 4. **Editorial Management**

#### **Get Dashboard Statistics**
- **Endpoint**: `GET /dashboard/stats`
- **What it does**: Provides comprehensive metrics and analytics for editorial oversight and reporting
- **Response Includes**:
  - Manuscript volume and status distribution
  - Review completion rates and times
  - Editorial performance metrics
  - Publication pipeline status
- **How it works**: Aggregates data across all manuscripts and reviews for analytical insights

#### **Update Reviewer Limits**
- **Endpoint**: `PUT /manuscripts/:id/reviewer-limit`
- **What it does**: Adjusts the number of reviewers assigned to a manuscript based on complexity or requirements
- **How it works**: Updates manuscript configuration for reviewer assignments

#### **Get All Reviewers**
- **Endpoint**: `GET /reviewers`
- **What it does**: Shows system-wide reviewer database for management and assignment oversight
- **How it works**: Provides comprehensive reviewer directory with performance data

#### **Get Manuscript Audit Trail**
- **Endpoint**: `GET /manuscripts/:id/audit-trail`
- **What it does**: Shows complete history of all actions and decisions on a manuscript
- **How it works**: Compiles chronological record of all manuscript activities for transparency and accountability

---

## Reviewer APIs
**Base Route**: `/api/v1/reviewer`
**Required Role**: Reviewer

Reviewers handle peer review assignments and provide expert assessment of manuscripts.

### 1. **Assignment Management**

#### **Get Assigned Manuscripts**
- **Endpoint**: `GET /assignments`
- **What it does**: Shows all peer review assignments for the reviewer with current status and deadlines
- **Query Parameters**:
  - `page`, `limit`: Pagination controls
  - `status`: Filter by assignment status (assigned, accepted, rejected, completed)
  - `search`: Search by manuscript ID
  - `sort`, `order`: Sorting preferences
- **How it works**: 
  - Retrieves assignments specific to the reviewer
  - Shows manuscript details and review requirements
  - Indicates deadlines and priority
- **Technical Details**:
  - Joins assignment and manuscript tables
  - Filters by reviewer ID from authentication
  - Includes manuscript metadata for context
- **Response Includes**:
  - Manuscript titles and abstracts
  - Assignment dates and deadlines
  - Current status of each review
  - Editor contact information

#### **Accept Review Assignment**
- **Endpoint**: `PUT /assignments/:id/accept`
- **What it does**: Confirms reviewer's commitment to complete a peer review assignment
- **Required Parameters**: 
  - `id` (string): Assignment identifier
- **How it works**: 
  - Updates assignment status to 'accepted'
  - Creates draft review record in database
  - Notifies editor of acceptance
  - Initializes review scoring template
- **Technical Details**:
  - Creates Review record with default values
  - Sets all scoring categories to minimum values initially
  - Links review to assignment and manuscript
  - Triggers email notification to editor

#### **Reject Review Assignment**
- **Endpoint**: `PUT /assignments/:id/reject`
- **What it does**: Declines a review assignment, allowing editor to find alternative reviewer
- **How it works**: 
  - Updates assignment status to 'rejected'
  - Frees up reviewer capacity
  - Notifies editor to select different reviewer
- **Technical Details**:
  - Validates that assignment hasn't been responded to yet
  - Updates reviewer availability metrics
  - Triggers editor notification for reassignment

### 2. **Review Completion**

#### **Get Review Comments**
- **Endpoint**: `GET /:reviewId/comments`
- **What it does**: Displays current review draft including scores and comments for editing
- **Required Parameters**: 
  - `reviewId` (string): Review record identifier
- **How it works**: 
  - Retrieves review in progress with all current data
  - Shows scoring across all evaluation criteria
  - Displays comments to authors and editors
- **Response Includes**:
  - Originality, methodology, significance scores
  - Clarity and language quality scores
  - Overall recommendation
  - Detailed comments and suggestions

#### **Add Comment**
- **Endpoint**: `POST /:reviewId/comments`
- **What it does**: Saves reviewer comments and feedback as part of the peer review process
- **Required Fields**:
  - `comment_type` (string): Type of comment (to authors, to editors)
  - `comment_text` (text): Detailed feedback content
  - `line_reference` (number, optional): Reference to specific manuscript lines
- **How it works**: 
  - Stores structured comments in database
  - Links comments to specific review and manuscript
  - Supports different comment types for appropriate audience
- **Technical Details**:
  - Creates ReviewComment records
  - Supports line-by-line manuscript feedback
  - Maintains comment versioning for edits

#### **Update Review Scores**
- **Endpoint**: `PUT /:reviewId/scores` (inferred from controller)
- **What it does**: Updates numerical scores across review criteria
- **Required Fields** (all scores 1-5):
  - `originality_score` (number): Novelty and innovation
  - `methodology_score` (number): Research methods quality
  - `significance_score` (number): Impact and importance
  - `clarity_score` (number): Writing and presentation quality
  - `language_score` (number): Grammar and language quality
  - `recommendation` (string): Overall recommendation
- **How it works**: Updates review record with new scoring data
- **Technical Details**:
  - Validates score ranges (1-5)
  - Prevents updates after review submission
  - Automatically saves draft progress

#### **Submit Review**
- **Endpoint**: `PUT /:reviewId/submit` (inferred from controller)
- **What it does**: Finalizes and submits completed peer review to editorial team
- **How it works**: 
  - Validates review completeness
  - Changes status from 'Draft' to 'Submitted'
  - Notifies editor of review completion
  - Locks review from further changes
- **Technical Details**:
  - Irreversible submission process
  - Triggers editorial workflow
  - Updates reviewer performance metrics

### 3. **File and Document Management**

#### **Upload Review Documents**
- **Endpoint**: `POST /:reviewId/upload` (inferred from multer setup)
- **What it does**: Allows reviewers to upload annotated manuscripts or supplementary review materials
- **File Support**: PDF annotations, additional documents
- **How it works**: 
  - Stores reviewer files in cloud storage
  - Links files to specific review record
  - Makes files available to editorial team
- **Technical Details**:
  - Uses multer for file handling
  - Organizes files by review and reviewer
  - Supports multiple file formats

---

## Invitation APIs
**Base Route**: `/api/v1/invitations`

These APIs manage the process of inviting new users (reviewers and editors) to join the platform.

### 1. **Reviewer Invitations**

#### **Invite New Reviewer**
- **Endpoint**: `POST /invite-reviewer` (requires editor/admin role)
- **What it does**: Creates a new reviewer account and sends invitation email with temporary credentials
- **Required Fields**:
  - `email` (string): Reviewer's email address
  - `first_name`, `last_name` (string): Reviewer's name
  - `category` (string): Subject area expertise
  - `temp_password` (string): Temporary password for first login
- **How it works**: 
  - Creates User account with 'Reviewer' role (inactive)
  - Creates Reviewer profile with category assignment
  - Generates secure invitation token
  - Sends welcome email with login credentials and invitation link
- **Technical Details**:
  - Account remains inactive until invitation is accepted
  - Creates AuthenticationMeta with invitation tracking
  - Generates 32-byte hex invitation token
  - 7-day expiration on invitation tokens
  - Implements rollback on any step failure

#### **Resend Reviewer Invitation**
- **Endpoint**: `POST /resend-reviewer` (requires editor/admin role)
- **What it does**: Sends a new invitation email to reviewers who haven't responded to initial invitation
- **How it works**: 
  - Generates new invitation token
  - Extends invitation expiration
  - Sends fresh invitation email
- **Technical Details**: Overwrites previous invitation token with new expiration

#### **Accept Reviewer Invitation**
- **Endpoint**: `POST /reviewer-accept` (public route)
- **What it does**: Activates reviewer account when they accept invitation through email link
- **Required Fields**:
  - `token` (string): Invitation token from email link
  - Additional profile information as needed
- **How it works**: 
  - Validates invitation token and expiration
  - Activates user account
  - Marks invitation as accepted
  - Enables full platform access

### 2. **Editor Invitations**

#### **Invite New Editor**
- **Endpoint**: `POST /invite-editor` (requires admin/EIC role)
- **What it does**: Creates editor account and sends invitation for editorial role
- **Required Fields**: Similar to reviewer invitation with editorial-specific fields
- **How it works**: 
  - Creates User account with 'Editor' role
  - Creates Editor profile with category assignment
  - Sends editor invitation with role responsibilities

#### **Accept Editor Invitation**
- **Endpoint**: `POST /editor-accept` (public route)
- **What it does**: Activates editor account and grants editorial permissions
- **How it works**: Similar to reviewer acceptance with editor-specific activation

### 3. **Invitation Management**

#### **Get Invitation Status**
- **Endpoint**: `GET /status/:token` (inferred)
- **What it does**: Checks the current status of a pending invitation
- **How it works**: 
  - Validates invitation token
  - Returns invitation details and expiration status
  - Shows whether invitation is still valid

---

## Support APIs

Support ticket system for users to request help and report issues.

### 1. **Ticket Creation and Management**

#### **Create Support Ticket**
- **Endpoint**: `POST /support-tickets` (route inferred from controller usage)
- **What it does**: Allows users to submit support requests and technical issues
- **Required Fields**:
  - `subject` (string): Issue summary
  - `description` (text): Detailed problem description
  - `category` (string): Issue type (technical, billing, editorial)
  - `manuscript_id` (string, optional): Related manuscript if applicable
- **How it works**: 
  - Creates ticket record with unique ID
  - Assigns initial status ('open')
  - Notifies support team
  - Links to user account for tracking

#### **Get Support Ticket**
- **Endpoint**: `GET /support-tickets/:id`
- **What it does**: Retrieves detailed information about a specific support ticket
- **How it works**: 
  - Fetches ticket with all related data
  - Shows current status and responses
  - Includes conversation history

### 2. **User Ticket Access**

#### **Get My Support Tickets**
- **Endpoint**: `GET /my-tickets` (route inferred)
- **What it does**: Shows all support tickets submitted by the current user
- **Query Parameters**:
  - `status`: Filter by ticket status
  - Pagination parameters
- **How it works**: 
  - Filters tickets by user ID
  - Shows ticket history and current status
  - Enables users to track their support requests

---

## Security and Authentication Details

### **Token Management**
- **Access Tokens**: Short-lived JWT tokens (15-60 minutes) for API authentication
- **Refresh Tokens**: Longer-lived tokens stored in secure HttpOnly cookies
- **Invitation Tokens**: Single-use tokens for account activation (7-day expiration)
- **Magic Link Tokens**: Single-use tokens for passwordless authentication (short expiration)

### **Role-Based Access Control**
- **Authentication Middleware**: Validates JWT tokens for protected routes
- **Authorization Middleware**: Enforces role-based permissions
- **Route Protection**: Different endpoints require specific roles
- **Data Filtering**: Users only see data relevant to their role and permissions

### **Security Features**
- **Password Hashing**: bcrypt with salt rounds for secure password storage
- **Token Rotation**: Refresh tokens are rotated on use for enhanced security
- **Session Management**: Single active session per user with token invalidation
- **Rate Limiting**: Protection against brute force attacks (implementation inferred)
- **Input Validation**: Comprehensive validation of all user inputs
- **File Upload Security**: Validation of file types and sizes for uploads

### **Data Privacy**
- **Safe Objects**: User data exposure limited to necessary fields
- **Email Enumeration Protection**: Consistent responses to prevent user discovery
- **Audit Trails**: Complete logging of administrative actions
- **Data Retention**: Deactivated accounts preserve data for audit purposes

---

## Error Handling and Response Formats

### **Standard Response Format**
```json
{
  "success": true/false,
  "data": {...},
  "message": "Description of result",
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### **Error Response Format**
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

### **Common HTTP Status Codes**
- **200**: Successful operation
- **201**: Resource created successfully
- **400**: Bad request (validation errors)
- **401**: Authentication required or invalid credentials
- **403**: Insufficient permissions for operation
- **404**: Resource not found
- **500**: Internal server error

---

This comprehensive documentation covers all API endpoints in the VITUOR system, providing both high-level explanations for non-technical users and detailed technical specifications for developers. Each endpoint includes its purpose, implementation details, required fields, and expected responses to facilitate proper integration and usage.