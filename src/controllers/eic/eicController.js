import { Op } from 'sequelize';
import {
    Manuscript,
    Review,
    ReviewComment,
    AssignReviewer,
    Editor,
    Reviewer,
    User,
    EditorInChief,
} from '../../database/models/index.js';

/**
 * Get all manuscripts pending EIC review
 * These are manuscripts where editor has submitted final decision
 */
export const getPendingManuscripts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            search,
            sort = 'updated_at',
            order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;

        const where = {
            editor_submitted_to_eic: true,
            status: {
                [Op.in]: ['Editor Review', 'Revision Required']
            }
        };

        if (category) {
            where.category = category;
        }

        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { id: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { rows, count } = await Manuscript.findAndCountAll({
            where,
            limit: Number(limit),
            offset: Number(offset),
            order: [[sort, order]],
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'first_name', 'last_name', 'email'],
                    include: [{
                        model: Author,
                        as: 'authorProfile',
                        attributes: ['institution', 'department', 'country']
                    }]
                },
                {
                    model: Editor,
                    as: 'handlingEditor',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['first_name', 'last_name']
                    }]
                }
            ]
        });

        res.json({
            data: rows,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Get all manuscripts (for EIC overview)
 */
export const getAllManuscripts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            category,
            search,
            sort = 'created_at',
            order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;

        const where = {};

        if (status) where.status = status;
        if (category) where.category = category;

        if (search) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { id: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { rows, count } = await Manuscript.findAndCountAll({
            where,
            limit: Number(limit),
            offset: Number(offset),
            order: [[sort, order]],
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'first_name', 'last_name', 'email']
                }
            ]
        });

        res.json({
            data: rows,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Get detailed manuscript view with all reviews and comments
 */
export const getManuscriptDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const manuscript = await Manuscript.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'first_name', 'last_name', 'email', 'prefix'],
                    include: [{
                        model: Author,
                        as: 'authorProfile',
                        attributes: ['institution', 'department', 'country', 'orcid_id']
                    }]
                },
                {
                    model: Editor,
                    as: 'handlingEditor',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['first_name', 'last_name', 'email']
                    }]
                },
                {
                    model: Review,
                    as: 'reviews',
                    include: [
                        {
                            model: Reviewer,
                            as: 'reviewer',
                            include: [{
                                model: User,
                                as: 'user',
                                attributes: ['first_name', 'last_name', 'email']
                            }]
                        },
                        {
                            model: ReviewComment,
                            as: 'comments'
                        }
                    ]
                },
                {
                    model: AssignReviewer,
                    as: 'assignments',
                    include: [{
                        model: Reviewer,
                        as: 'reviewer',
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['first_name', 'last_name', 'email']
                        }]
                    }]
                }
            ]
        });

        if (!manuscript) {
            return res.status(404).json({ message: 'Manuscript not found' });
        }

        res.json({
            data: manuscript,
            message: 'Manuscript details fetched successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Get all reviews for a specific manuscript
 */
export const getManuscriptReviews = async (req, res) => {
    try {
        const { id } = req.params;

        const reviews = await Review.findAll({
            where: { manuscript_id: id },
            include: [
                {
                    model: Reviewer,
                    as: 'reviewer',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['first_name', 'last_name', 'email']
                    }]
                },
                {
                    model: ReviewComment,
                    as: 'comments'
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({
            data: reviews,
            message: 'Reviews fetched successfully'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Get editor's final decision for a manuscript
 */
export const getEditorDecision = async (req, res) => {
    try {
        const { id } = req.params;

        const manuscript = await Manuscript.findByPk(id, {
            // attributes: ['id', 'editor_final_decision', 'handling_editor_id'],
            attributes: ['id', 'editor_final_decision'],
            include: [{
                model: Editor,
                as: 'handlingEditor',
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['first_name', 'last_name', 'email']
                }]
            }]
        });

        if (!manuscript) {
            return res.status(404).json({ message: 'Manuscript not found' });
        }

        res.json({
            data: {
                manuscript_id: manuscript.id,
                editor_decision: manuscript.editor_final_decision,
                // handling_editor: manuscript.handlingEditor
            },
            message: 'Editor decision fetched successfully'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Make final decision as EIC
 */
export const makeFinalDecision = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            decision, // 'Accept', 'Minor Revision', 'Major Revision', 'Reject'
            note_to_author,
            internal_notes,
            visible_comment_ids, // Array of review comment IDs to show author
            increase_reviewer_limit // Optional new limit
        } = req.body;

        const userId = req.user.id;

        // Find EIC profile
        const eic = await EditorInChief.findOne({ where: { user_id: userId } });
        if (!eic) {
            return res.status(403).json({ message: 'Only Editor-in-Chief can make final decisions' });
        }

        const manuscript = await Manuscript.findByPk(id);
        if (!manuscript) {
            return res.status(404).json({ message: 'Manuscript not found' });
        }

        // Update manuscript based on decision
        manuscript.eic_decision = decision;
        manuscript.eic_decision_note = note_to_author;
        manuscript.eic_internal_notes = internal_notes;
        manuscript.eic_decision_date = new Date();

        // Set visible comments for author (if revision)
        if (visible_comment_ids && Array.isArray(visible_comment_ids)) {
            manuscript.visible_comments_to_author = visible_comment_ids;

            // Update review visibility flags
            await Review.update(
                { is_visible_to_author: false },
                { where: { manuscript_id: id } }
            );

            await Review.update(
                { is_visible_to_author: true },
                {
                    where: {
                        id: { [Op.in]: visible_comment_ids }
                    }
                }
            );
        }

        // Update reviewer limit if requested
        if (increase_reviewer_limit && increase_reviewer_limit > manuscript.max_reviewer_limit) {
            manuscript.max_reviewer_limit = increase_reviewer_limit;
        }

        // Update manuscript status based on decision
        switch (decision) {
            case 'Accept':
                manuscript.status = 'Accepted';
                break;
            case 'Reject':
                manuscript.status = 'Rejected';
                break;
            case 'Minor Revision':
            case 'Major Revision':
                manuscript.status = 'Revision Required';
                break;
            default:
                manuscript.status = 'Editor Review';
        }

        // Reset editor submission flag
        manuscript.editor_submitted_to_eic = false;

        await manuscript.save();

        // If revision, we might want to create a new version
        if (decision.includes('Revision')) {
            // Logic to create new version can be added here
            // This would involve creating a new ManuscriptVersion record
        }

        res.json({
            data: manuscript,
            message: `Manuscript ${decision === 'Accept' ? 'accepted' :
                decision === 'Reject' ? 'rejected' : 'sent for revision'} successfully`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Send manuscript back to author for revision with specific comments visible
 */
export const sendForRevision = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            note_to_author,
            visible_comment_ids,
            increase_reviewer_limit
        } = req.body;

        const userId = req.user.id;

        // Find EIC profile
        const eic = await EditorInChief.findOne({ where: { user_id: userId } });
        if (!eic) {
            return res.status(403).json({ message: 'Only Editor-in-Chief can send for revision' });
        }

        const manuscript = await Manuscript.findByPk(id);
        if (!manuscript) {
            return res.status(404).json({ message: 'Manuscript not found' });
        }

        // Update manuscript for revision
        manuscript.status = 'Revision Required';
        manuscript.eic_decision = 'Major Revision';
        manuscript.eic_decision_note = note_to_author;
        manuscript.eic_decision_date = new Date();

        // Set visible comments
        if (visible_comment_ids && Array.isArray(visible_comment_ids)) {
            manuscript.visible_comments_to_author = visible_comment_ids;

            // Update visibility flags
            await Review.update(
                { is_visible_to_author: false },
                { where: { manuscript_id: id } }
            );

            await Review.update(
                { is_visible_to_author: true },
                { where: { id: { [Op.in]: visible_comment_ids } } }
            );
        }

        // Increase reviewer limit if requested
        if (increase_reviewer_limit && increase_reviewer_limit > manuscript.max_reviewer_limit) {
            manuscript.max_reviewer_limit = increase_reviewer_limit;
        }

        manuscript.editor_submitted_to_eic = false;
        await manuscript.save();

        res.json({
            data: manuscript,
            message: 'Manuscript sent for revision successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Update reviewer limit for a manuscript
 */
export const updateReviewerLimit = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_limit } = req.body;

        const userId = req.user.id;

        // Find EIC profile
        const eic = await EditorInChief.findOne({ where: { user_id: userId } });
        if (!eic) {
            return res.status(403).json({ message: 'Only Editor-in-Chief can update reviewer limit' });
        }

        const manuscript = await Manuscript.findByPk(id);
        if (!manuscript) {
            return res.status(404).json({ message: 'Manuscript not found' });
        }

        manuscript.max_reviewer_limit = new_limit;
        await manuscript.save();

        res.json({
            data: { max_reviewer_limit: manuscript.max_reviewer_limit },
            message: 'Reviewer limit updated successfully'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Get all reviewers (for EIC overview)
 */
export const getAllReviewers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            availability,
            search
        } = req.query;

        const offset = (page - 1) * limit;

        const where = {};
        if (category) where.assigned_category = category;
        if (availability) where.availability_status = availability;

        const include = [{
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name', 'email', 'profile_image'],
            where: search ? {
                [Op.or]: [
                    { first_name: { [Op.iLike]: `%${search}%` } },
                    { last_name: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } }
                ]
            } : {}
        }];

        const { rows, count } = await Reviewer.findAndCountAll({
            where,
            include,
            limit: Number(limit),
            offset: Number(offset),
            distinct: true
        });

        res.json({
            data: rows,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Get dashboard statistics for EIC
 */
export const getDashboardStats = async (req, res) => {
    try {
        // Get counts for different statuses
        const [
            totalManuscripts,
            pendingReview,
            accepted,
            rejected,
            inRevision,
            published
        ] = await Promise.all([
            Manuscript.count(),
            Manuscript.count({ where: { editor_submitted_to_eic: true } }),
            Manuscript.count({ where: { status: 'Accepted' } }),
            Manuscript.count({ where: { status: 'Rejected' } }),
            Manuscript.count({ where: { status: 'Revision Required' } }),
            Manuscript.count({ where: { status: 'Published' } })
        ]);

        // Get counts by category
        const categories = ['medicine', 'oncology', 'neurology', 'surgery', 'genetics', 'cardiology'];
        const categoryCounts = await Promise.all(
            categories.map(async (category) => ({
                category,
                count: await Manuscript.count({ where: { category } })
            }))
        );

        // Get recent manuscripts
        const recentManuscripts = await Manuscript.findAll({
            limit: 10,
            order: [['created_at', 'DESC']],
            include: [{
                model: User,
                as: 'author',
                attributes: ['first_name', 'last_name']
            }]
        });

        res.json({
            data: {
                overview: {
                    totalManuscripts,
                    pendingEICReview: pendingReview,
                    accepted,
                    rejected,
                    inRevision,
                    published
                },
                categoryDistribution: categoryCounts,
                recentManuscripts
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Get audit trail for a manuscript
 */
export const getManuscriptAuditTrail = async (req, res) => {
    try {
        const { id } = req.params;

        const manuscript = await Manuscript.findByPk(id, {
            attributes: [
                'id', 'status', 'created_at', 'updated_at',
                'eic_decision', 'eic_decision_date', 'editor_final_decision'
            ],
            include: [
                {
                    model: AssignReviewer,
                    as: 'assignments',
                    attributes: ['created_at', 'status', 'deadline'],
                    include: [{
                        model: Reviewer,
                        as: 'reviewer',
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['first_name', 'last_name']
                        }]
                    }]
                },
                {
                    model: Review,
                    as: 'reviews',
                    attributes: ['created_at', 'updated_at', 'status', 'recommendation']
                }
            ]
        });

        if (!manuscript) {
            return res.status(404).json({ message: 'Manuscript not found' });
        }

        // You might want to add a separate AuditLog model for complete tracking
        // For now, we'll return the existing timeline data

        res.json({
            data: manuscript,
            message: 'Audit trail fetched successfully'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};