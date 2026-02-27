// controllers/reviewer/reviewerController.js
import { Op } from 'sequelize';
import {
  AssignReviewer,
  Manuscript,
  Review,
  ReviewComment,
  SupportTicket,
  Reviewer,
  User,
} from '../../database/models/index.js';
import { uploadToR2, deleteFromR2 } from '../../services/r2Services.js';

/**
 * GET ALL ASSIGNED MANUSCRIPTS
 * pagination + filter
 */
export const getAssignedManuscripts = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.user_id;

    // First, get the reviewer record for this user
    const reviewer = await Reviewer.findOne({ where: { user_id: userId } });
    if (!reviewer) {
      return res.status(404).json({ message: 'Reviewer profile not found' });
    }
    const reviewerId = reviewer.id;

    const {
      page = 1,
      limit = 10,
      status,
      search,
      sort = 'created_at',
      order = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;

    const where = {
      reviewer_id: reviewerId,
    };

    if (status) where.status = status;

    if (search) {
      where[Op.or] = [{ manuscript_id: { [Op.iLike]: `%${search}%` } }];
    }

    const { rows, count } = await AssignReviewer.findAndCountAll({
      where,
      limit: Number(limit),
      offset: Number(offset),
      order: [[sort, order]],
      include: [
        {
          model: Manuscript,
          as: 'manuscript',
          attributes: ['id', 'title', 'abstract', 'category', 'manuscript_type', 'status', 'keywords', 'main_file', 'cover_letter'],
        },
        {
          model: Review,
          as: 'review',
          required: false,
        },
      ],
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * ACCEPT REVIEW ASSIGNMENT
 * NOTE: Does NOT create Review record - that happens on-demand when reviewer first interacts
 */
export const acceptReviewAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.body.user_id;

    // First, get the reviewer record for this user
    const reviewer = await Reviewer.findOne({ where: { user_id: userId } });
    if (!reviewer) {
      return res.status(404).json({ message: 'Reviewer profile not found' });
    }
    const reviewerId = reviewer.id;

    const assignment = await AssignReviewer.findOne({
      where: { assign_reviewer_id: id, reviewer_id: reviewerId },
    });

    if (!assignment)
      return res.status(404).json({ message: 'Assignment not found' });

    if (assignment.status !== 'assigned')
      return res.status(400).json({ message: 'Already responded' });

    // update assignment status only
    // Review will be created on-demand when reviewer first interacts
    assignment.status = 'accepted';
    await assignment.save();

    res.json({
      message: 'Review accepted',
      assignment,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * REJECT REVIEW ASSIGNMENT
 */
export const rejectReviewAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.body.user_id;

    // First, get the reviewer record for this user
    const reviewer = await Reviewer.findOne({ where: { user_id: userId } });
    if (!reviewer) {
      return res.status(404).json({ message: 'Reviewer profile not found' });
    }
    const reviewerId = reviewer.id;

    const assignment = await AssignReviewer.findOne({
      where: { assign_reviewer_id: id, reviewer_id: reviewerId },
    });

    if (!assignment)
      return res.status(404).json({ message: 'Assignment not found' });

    if (assignment.status !== 'assigned')
      return res.status(400).json({ message: 'Already responded' });

    assignment.status = 'rejected';
    await assignment.save();

    res.json({ message: 'Review rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMyReview = async (req, res) => {
  try {
    const { assignId } = req.params;
    const userId = req.user?.id;

    // First, get the reviewer record for this user
    const reviewer = await Reviewer.findOne({ where: { user_id: userId } });
    if (!reviewer) {
      return res.status(404).json({ message: 'Reviewer profile not found' });
    }
    const reviewerId = reviewer.id;

    // Get the assignment with manuscript and review data (same structure as getAssignedManuscripts)
    const assignment = await AssignReviewer.findOne({
      where: { 
        assign_reviewer_id: assignId,
        reviewer_id: reviewerId 
      },
      include: [
        {
          model: Manuscript,
          as: 'manuscript',
          attributes: ['id', 'title', 'abstract', 'category', 'manuscript_type', 'status', 'keywords', 'main_file', 'cover_letter'],
        },
        {
          model: Review,
          as: 'review',
          required: false,
        },
      ],
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * CREATE REVIEW ON-DEMAND
 * Called when reviewer first tries to add comment or save scores
 * If review already exists, return it. Otherwise create with defaults
 */
export const createOrGetReview = async (req, res) => {
  try {
    const { assignId } = req.params;
    const userId = req.user?.id;

    // First, get the reviewer record for this user
    const reviewer = await Reviewer.findOne({ where: { user_id: userId } });
    if (!reviewer) {
      return res.status(404).json({ message: 'Reviewer profile not found' });
    }
    const reviewerId = reviewer.id;

    // Get the assignment to verify access and get manuscript_id
    const assignment = await AssignReviewer.findOne({
      where: { 
        assign_reviewer_id: assignId,
        reviewer_id: reviewerId 
      },
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.status !== 'accepted') {
      return res.status(400).json({ message: 'Assignment must be accepted first' });
    }

    // Check if review already exists
    let review = await Review.findOne({
      where: { assign_reviewer_id: assignId },
    });

    // If it doesn't exist, create it
    if (!review) {
      review = await Review.create({
        assign_reviewer_id: assignId,
        manuscript_id: assignment.manuscript_id,
        reviewer_id: reviewerId,
        status: 'Draft',
        originality_score: 1,
        methodology_score: 1,
        significance_score: 1,
        clarity_score: 1,
        language_score: 1,
        recommendation: 'Major Revision',
        comments_to_author: '',
      });
    }

    res.json({
      message: review.isNewRecord ? 'Review created' : 'Review already exists',
      review,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * UPDATE SCORES / TEXT
 */
export const updateReviewScores = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByPk(reviewId);
    if (!review) return res.status(404).json({ message: 'Not found' });

    if (review.status === 'Submitted')
      return res.status(400).json({ message: 'Locked' });

    await review.update(req.body);

    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * SUBMIT REVIEW
 */
export const submitReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByPk(reviewId);
    if (!review) return res.status(404).json({ message: 'Not found' });

    review.status = 'Submitted';
    await review.save();

    // update assignment
    await AssignReviewer.update(
      { status: 'completed' },
      { where: { assign_reviewer_id: review.assign_reviewer_id } }
    );

    res.json({ message: 'Review submitted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET ALL COMMENTS FOR REVIEW
 */
export const getReviewComments = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const comments = await ReviewComment.findAll({
      where: { review_id: reviewId },
      order: [['page_number', 'ASC']],
    });

    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ADD COMMENT
 */
export const addComment = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { page_number, line_number, comment, type } = req.body;

    const newComment = await ReviewComment.create({
      review_id: reviewId,
      page_number,
      line_number,
      comment,
      type,
    });

    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * UPDATE COMMENT
 */
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;

    const c = await ReviewComment.findByPk(id);
    if (!c) return res.status(404).json({ message: 'Not found' });

    await c.update(req.body);
    res.json(c);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE COMMENT
 */
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const c = await ReviewComment.findByPk(id);
    if (!c) return res.status(404).json({ message: 'Not found' });

    await c.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const raiseSupportTicket = async (req, res) => {
  try {
    const reviewerId = req.user?.id || req.body.user_id;

    const { manuscript_id, category, subject, description, attachment } =
      req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({
        message: 'category, subject, description are required',
      });
    }

    // Optional: verify manuscript exists
    if (manuscript_id) {
      const manuscript = await Manuscript.findByPk(manuscript_id);
      if (!manuscript)
        return res.status(404).json({ message: 'Manuscript not found' });
    }

    const ticket = await SupportTicket.create({
      user_id: reviewerId,
      manuscript_id,
      category,
      subject,
      description,
      attachment,
      status: 'open',
    });

    res.status(201).json({
      message: 'Support ticket raised successfully',
      ticket,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getMySupportTickets = async (req, res) => {
  try {
    const reviewerId = req.user?.id || req.query.user_id;

    const { page = 1, limit = 10, status } = req.query;

    const offset = (page - 1) * limit;

    const where = {
      user_id: reviewerId,
    };

    if (status) where.status = status;

    const { rows, count } = await SupportTicket.findAndCountAll({
      where,
      limit: Number(limit),
      offset: Number(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Manuscript,
          as: 'manuscript',
        },
        {
          model: Admin,
          as: 'admin',
          attributes: ['user_id'],
        },
      ],
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET REVIEWER PROFILE
 */
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id; // Assuming auth middleware provides this

    const profile = await User.findOne({
      where: { id: userId },
      attributes: [
        'id',
        'prefix',
        'first_name',
        'last_name',
        'email',
        'profile_image',
      ],
      include: [
        {
          model: Reviewer,
          as: 'reviewerProfile', // Ensure this alias matches your association
          attributes: [
            'phone',
            'institution',
            'department',
            'country',
            'professional_bio',
            'specialties',
          ],
        },
      ],
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * UPDATE REVIEWER PROFILE
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Destructure text fields from req.body
    const {
      first_name,
      last_name,
      phone,
      institution,
      department,
      country,
      professional_bio,
      specialties,
    } = req.body;

    // 1. Handle Profile Image Upload logic
    let profileImageData = undefined;

    if (req.file) {
      const user = await User.findByPk(userId);

      // Delete old image from Cloudflare R2 if it exists
      if (user?.profile_image?.key) {
        await deleteFromR2(user.profile_image.key);
      }

      // Upload new image to the 'profiles' folder
      profileImageData = await uploadToR2(req.file, 'profiles');
    }

    let parsedSpecialties = specialties;

    if (typeof specialties === 'string') {
      try {
        parsedSpecialties = JSON.parse(specialties);
      } catch {
        parsedSpecialties = specialties.split(',').map((s) => s.trim());
      }
    }

    // 2. Update User Table
    const userUpdatePayload = { first_name, last_name };
    if (profileImageData) {
      userUpdatePayload.profile_image = profileImageData;
    }
    await User.update(userUpdatePayload, { where: { id: userId } });

    // 3. Update Reviewer Specific Fields
    await Reviewer.update(
      {
        phone,
        institution,
        department,
        country,
        professional_bio,
        specialties: parsedSpecialties
      },
      { where: { user_id: userId } } // Ensure this matches your foreign key name
    );

    res.json({
      message: 'Profile updated successfully',
      profile_image: profileImageData || undefined,
    });
  } catch (err) {
    console.error('Reviewer Update Error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteReviewerImage = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findByPk(userId);

    if (user?.profile_image?.key) {
      await deleteFromR2(user.profile_image.key);
      user.profile_image = null;
      await user.save();
    }

    res.json({ message: 'Profile image removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * FETCH REVIEWER PREFERENCES
 * Specifically for the "Expertise & Workload" settings page
 */
export const fetchReviewPreferences = async (req, res) => {
  try {
    const userId = req.user?.id;

    const preferences = await Reviewer.findOne({
      where: { user_id: userId },
      attributes: [
        'expertise_areas',
        'preferred_journals',
        'languages',
        'max_current_reviews',
      ],
    });

    if (!preferences) {
      return res
        .status(404)
        .json({ message: 'Reviewer preferences not found' });
    }

    res.json(preferences);
  } catch (err) {
    console.error('Error fetching preferences:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * UPDATE REVIEWER PREFERENCES
 * Updates only the tags and workload constraints
 */
export const updateReviewPreferences = async (req, res) => {
  try {
    const userId = req.user?.id;
    const {
      expertise_areas,
      preferred_journals,
      languages,
      max_current_reviews,
    } = req.body;

    // Use update to modify only the Reviewer table
    const [updatedCount] = await Reviewer.update(
      {
        expertise_areas,
        preferred_journals,
        languages,
        max_current_reviews,
      },
      {
        where: { user_id: userId },
      }
    );

    if (updatedCount === 0) {
      return res.status(404).json({ message: 'Reviewer record not found' });
    }

    res.json({ message: 'Preferences updated successfully' });
  } catch (err) {
    console.error('Error updating preferences:', err);
    res.status(500).json({ message: err.message });
  }
};
