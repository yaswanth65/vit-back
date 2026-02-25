// controllers/author/myManuscriptsController.js
import { Manuscript, Author } from '../../database/models/index.js';
import { uploadToR2, deleteFromR2 } from '../../services/r2Services.js';
import { Op } from 'sequelize';

/**
 * STEP 1 → CREATE DRAFT
 */
export const createDraft = async (req, res) => {
  try {
    console.log('createDraft called. User:', req.user ? req.user.id : 'undefined');

    if (!req.user) {
      console.error('Error: Request has no user attached. Auth middleware might have failed.');
      return res.status(401).json({ message: 'User not authenticated. Please log in again.' });
    }

    const { title, abstract, keywords, category, manuscript_type } = req.body;

    // Get author ID from authenticated user
    const author = await Author.findOne({ where: { user_id: req.user.id } });
    
    if (!author) {
      return res.status(404).json({ message: 'Author profile not found. Please complete your profile first.' });
    }

    // Handle keywords: convert string to array if needed
    let keywordsArray = keywords;
    if (typeof keywords === 'string') {
      keywordsArray = keywords.split(',').map(k => k.trim()).filter(k => k);
    }

    const manuscript = await Manuscript.create({
      author_id: author.id,
      title,
      abstract,
      keywords: keywordsArray,
      category,
      manuscript_type,
      status: 'Draft',
    });

    res.status(201).json({ manuscript });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * UPDATE DETAILS
 */
export const updateDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const manuscript = await Manuscript.findByPk(id);
    if (!manuscript) return res.status(404).json({ message: 'Not found' });

    await manuscript.update(req.body);

    res.json({ manuscript });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * STEP 2 → AUTHORS
 */
export const updateAuthors = async (req, res) => {
  try {
    const { id } = req.params;
    const { authors } = req.body;

    const manuscript = await Manuscript.findByPk(id);
    if (!manuscript) return res.status(404).json({ message: 'Not found' });

    manuscript.authors = authors;
    await manuscript.save();

    res.json({ manuscript });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

console.log('R2 creds', {
  key: process.env.R2_ACCESS_KEY_ID,
  secret: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT,
});

/**
 * STEP 3 → FILES
 */
export const uploadFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const manuscript = await Manuscript.findByPk(id);
    if (!manuscript) return res.status(404).json({ message: 'Not found' });

    // MAIN FILE
    if (req.files.main_file) {
      const file = await uploadToR2(req.files.main_file[0], 'manuscripts');
      manuscript.main_file = file;
    }

    // COVER LETTER
    if (req.files.cover_letter) {
      const file = await uploadToR2(req.files.cover_letter[0], 'coverLetters');
      manuscript.cover_letter = file;
    }

    // SUPPLEMENTARY
    if (req.files.supplementary_files) {
      const uploads = [];
      for (const f of req.files.supplementary_files) {
        uploads.push(await uploadToR2(f, 'supplementary'));
      }
      manuscript.supplementary_files = [
        ...(manuscript.supplementary_files || []),
        ...uploads,
      ];
    }

    await manuscript.save();
    res.json({ manuscript });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE FILE
 */
export const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { key, type } = req.body;

    const manuscript = await Manuscript.findByPk(id);

    await deleteFromR2(key);

    if (type === 'main') manuscript.main_file = null;
    if (type === 'cover') manuscript.cover_letter = null;

    if (type === 'supplementary') {
      manuscript.supplementary_files = manuscript.supplementary_files.filter(
        (f) => f.key !== key
      );
    }

    await manuscript.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * STEP 4 → SUBMIT
 */
export const submitManuscript = async (req, res) => {
  try {
    const { id } = req.params;

    const manuscript = await Manuscript.findByPk(id);
    if (!manuscript) return res.status(404).json({ message: 'Not found' });

    // validation before submit
    if (!manuscript.main_file || !manuscript.cover_letter)
      return res.status(400).json({ message: 'Files missing' });

    manuscript.status = 'Submitted';
    await manuscript.save();

    res.json({ manuscript });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET SINGLE
 */
export const getManuscriptById = async (req, res) => {
  try {
    const manuscript = await Manuscript.findByPk(req.params.id);
    if (!manuscript) return res.status(404).json({ message: 'Manuscript not found' });
    res.json({ manuscript });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMyManuscripts = async (req, res) => {
  try {
    // Get Author profile ID from User ID
    const author = await Author.findOne({ where: { user_id: req.user.id } });
    if (!author) return res.status(404).json({ message: 'Author profile not found' });
    
    const authorId = author.id;

    const {
      page = 1,
      limit = 10,
      status,
      search,
      sort = 'created_at',
      order = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;

    // ================= FILTER =================
    const where = {
      author_id: authorId,
    };

    if (status) {
      where.status = status;
    }

    // ================= SEARCH =================
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { id: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // ================= QUERY =================
    const { rows, count } = await Manuscript.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order]],
    });

    res.json({
      manuscripts: rows,
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
 * Get visible reviews for author during revision
 */
export const getVisibleReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const authorId = req.user.id;

    const manuscript = await Manuscript.findOne({
      where: {
        id,
        author_id: authorId,
      },
    });

    if (!manuscript) {
      return res.status(404).json({ message: 'Manuscript not found' });
    }

    // Get only reviews marked as visible to author
    const visibleReviews = await Review.findAll({
      where: {
        manuscript_id: id,
        is_visible_to_author: true,
      },
      include: [
        {
          model: ReviewComment,
          as: 'comments',
        },
      ],
      attributes: [
        'id',
        'originality_score',
        'methodology_score',
        'significance_score',
        'clarity_score',
        'language_score',
        'comments_to_author',
        'recommendation',
      ],
    });

    res.json({
      data: visibleReviews,
      message: 'Visible reviews fetched successfully',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Submit revised manuscript
 */
export const submitRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const authorId = req.user.id;

    const manuscript = await Manuscript.findOne({
      where: {
        id,
        author_id: authorId,
        status: 'Revision Required',
      },
    });

    if (!manuscript) {
      return res
        .status(404)
        .json({ message: 'Manuscript not found or not in revision state' });
    }

    // Increment version
    manuscript.version += 1;

    // Update files if provided
    if (req.files.main_file) {
      const file = await uploadToR2(req.files.main_file[0], 'manuscripts');
      manuscript.main_file = file;
    }

    manuscript.status = 'Submitted';
    manuscript.editor_submitted_to_eic = false; // Reset so editor can review again
    await manuscript.save();

    res.json({
      data: manuscript,
      message: 'Revision submitted successfully',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
