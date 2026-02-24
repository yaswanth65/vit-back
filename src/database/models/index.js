/**
 * VITUOR Database Models Index
 * Defines all associations and exports centralized models
 */

import User from './User.js';
import AuthenticationMeta from './AuthenticationMeta.js';
import Author from './Author.js';
import Reviewer from './Reviewer.js';
import Editor from './Editor.js';
import EditorInChief from './EditorInChief.js';
import Admin from './Admin.js';
import Manuscript from './Manuscript.js';
import ManuscriptVersion from './manuScriptVersion.js';
import Review from './Reviews.js';
import Issue from './Issue.js';
import AssignReviewer from './AssignReviewerModel.js';
import ReviewComment from './reviewComment.js';
import SupportTicket from './supportTicket.js';

// =====================================================
// 1) USER ↔ AUTHENTICATION META (Strict 1:1)
// =====================================================
User.hasOne(AuthenticationMeta, {
  foreignKey: 'user_id',
  as: 'authMeta',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
AuthenticationMeta.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// =====================================================
// 2) USER ↔ ROLE PROFILES (Conditional 1:1)
// =====================================================
const roles = [
  { model: Author, as: 'authorProfile' },
  { model: Reviewer, as: 'reviewerProfile' },
  { model: Editor, as: 'editorProfile' },
  { model: EditorInChief, as: 'eicProfile' },
  { model: Admin, as: 'adminProfile' },
];

roles.forEach(({ model, as }) => {
  User.hasOne(model, {
    foreignKey: 'user_id',
    as,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  model.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user',
  });
});

// =====================================================
// 3) INVITATION LOGIC (Link AuthMeta to the Inviter)
// =====================================================
// As per requirement: Invitation fields are in AuthMeta.
// 'invited_by' in AuthenticationMeta points to the User who sent it.
// AuthenticationMeta.belongsTo(User, {
//   foreignKey: 'invited_by',
//   as: 'inviter',
//   onDelete: 'SET NULL',
// });

// User.hasMany(AuthenticationMeta, {
//   foreignKey: 'invited_by',
//   as: 'sentInvitations',
// });

// =====================================================
// 4) EDITORIAL WORKFLOW (Manuscripts & Reviews)
// =====================================================

// Author → Manuscript (1:N)
Author.hasMany(Manuscript, {
  foreignKey: 'author_id',
  as: 'manuscripts',
  onDelete: 'CASCADE',
});
Manuscript.belongsTo(Author, {
  foreignKey: 'author_id',
  as: 'author',
});

// // Editor → Manuscript (1:N)
// Editor.hasMany(Manuscript, {
//   foreignKey: 'handling_editor_id',
//   as: 'assignedManuscripts',
//   onDelete: 'SET NULL',
// });
// Manuscript.belongsTo(Editor, {
//   foreignKey: 'handling_editor_id',
//   as: 'handlingEditor',
// });

// Manuscript → Versions (1:N)
Manuscript.hasMany(ManuscriptVersion, {
  foreignKey: 'manuscript_id',
  as: 'versions',
  onDelete: 'CASCADE',
});
ManuscriptVersion.belongsTo(Manuscript, {
  foreignKey: 'manuscript_id',
  as: 'manuscript',
});

// Manuscript → Reviews (1:N)
Manuscript.hasMany(Review, {
  foreignKey: 'manuscript_id',
  as: 'reviews',
  onDelete: 'CASCADE',
});
Review.belongsTo(Manuscript, {
  foreignKey: 'manuscript_id',
  as: 'manuscript',
});

// Reviewer → Reviews (1:N)
Reviewer.hasMany(Review, {
  foreignKey: 'user_id',
  as: 'completedReviews',
  onDelete: 'CASCADE',
});
Review.belongsTo(Reviewer, {
  foreignKey: 'user_id',
  as: 'reviewer',
});

// =====================================================
// 5) ASSIGN REVIEWER RELATIONSHIPS
// =====================================================

// Manuscript → AssignReviewer (1:N)
Manuscript.hasMany(AssignReviewer, {
    foreignKey: 'manuscript_id',
    as: 'assignments',
    onDelete: 'CASCADE',
});
AssignReviewer.belongsTo(Manuscript, {
    foreignKey: 'manuscript_id',
    as: 'manuscript',
});

// Reviewer → AssignReviewer (1:N)
Reviewer.hasMany(AssignReviewer, {
  // foreignKey: 'user_id',
  foreignKey: 'reviewer_id',
  as: 'reviewAssignments',
  onDelete: 'CASCADE',
});
AssignReviewer.belongsTo(Reviewer, {
  foreignKey: 'reviewer_id',
  as: 'reviewer',
});

// Editor → AssignReviewer (1:N) - For assigned_by field
Editor.hasMany(AssignReviewer, {
    foreignKey: 'assigned_by',
    as: 'madeAssignments',
    onDelete: 'SET NULL',
});
AssignReviewer.belongsTo(Editor, {
    foreignKey: 'assigned_by',
    as: 'assigningEditor',
});

// =====================================================
// 6) REVIEW COMMENTS RELATIONSHIPS
// =====================================================

// Review → ReviewComment (1:N)
Review.hasMany(ReviewComment, {
    foreignKey: 'review_id',
    as: 'comments',
    onDelete: 'CASCADE',
});
ReviewComment.belongsTo(Review, {
    foreignKey: 'review_id',
    as: 'review',
});

// =====================================================
// 7) PUBLISHING (Issues)
// =====================================================
// Issue.hasMany(Manuscript, {
//   foreignKey: 'issue_id',
//   as: 'articles',
// });
// Manuscript.belongsTo(Issue, {
//   foreignKey: 'issue_id',
//   as: 'issue',
// });

// =====================================================
// 9) SELF-REFERENTIAL INVITATION (USER → USER)
// =====================================================
// User.belongsTo(User, {
//   foreignKey: 'invited_by',
//   as: 'inviter',
//   onDelete: 'SET NULL',
// });

// User.hasMany(User, {
//   foreignKey: 'invited_by',
//   as: 'invitedUsers',
// });

// ----------- Review -------------

// =====================================================
// 10) SUPPORT TICKET SYSTEM
// =====================================================

// Reviewer → SupportTickets (1:N)
Reviewer.hasMany(SupportTicket, {
  foreignKey: 'user_id',
  as: 'supportTickets',
  onDelete: 'CASCADE',
});

SupportTicket.belongsTo(Reviewer, {
  foreignKey: 'user_id',
  as: 'reviewer',
});


// Admin → SupportTickets (1:N)
Admin.hasMany(SupportTicket, {
  foreignKey: 'admin_id',
  as: 'assignedSupportTickets',
  onDelete: 'SET NULL',
});

SupportTicket.belongsTo(Admin, {
  foreignKey: 'admin_id',
  as: 'admin',
});


// Manuscript → SupportTickets (1:N)
Manuscript.hasMany(SupportTicket, {
  foreignKey: 'manuscript_id',
  as: 'supportTickets',
  onDelete: 'SET NULL',
});

SupportTicket.belongsTo(Manuscript, {
  foreignKey: 'manuscript_id',
  as: 'manuscript',
});

// =====================================================
// FINAL EXPORTS
// =====================================================
export {
  User,
  AuthenticationMeta,
  Author,
  Reviewer,
  Editor,
  EditorInChief,
  Admin,
  Manuscript,
  ManuscriptVersion,
  Review,
  Issue,
  SupportTicket,
  ReviewComment,
  AssignReviewer
};