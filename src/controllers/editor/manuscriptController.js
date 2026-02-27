// controllers/editor/manuscriptController.js
import { Editor, Issue, Manuscript, Reviewer, AssignReviewer, User, Review, Author } from '../../database/models/index.js';
import { uploadToR2, deleteFromR2 } from '../../services/r2Services.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';

/**
 * Get Editor Dashboard Stats
 * Returns statistics for manuscripts in the editor's assigned category
 */
export const getEditorStats = async (req, res) => {
    try {
        const user_id = req.user.id;
        
        const editor = await Editor.findOne({ where: { user_id } });
        if (!editor) {
            return res.status(404).json({ message: 'Editor profile not found' });
        }

        const category = editor.assigned_category;

        // Get all manuscripts in editor's category
        const [
            newSubmissions,
            needsReviewers,
            awaitingReviews,
            readyForDecision,
            totalManuscripts
        ] = await Promise.all([
            // New Submissions - Status is 'Submitted' (not yet assigned reviewers)
            Manuscript.count({
                where: {
                    category,
                    status: 'Submitted'
                }
            }),
            // Needs Reviewers - Has fewer than required reviewers assigned
            Manuscript.count({
                where: {
                    category,
                    status: { [Op.in]: ['Submitted', 'Editor Review'] },
                    [Op.or]: [
                        { reviewer_ids: null },
                        { reviewer_ids: { [Op.eq]: [] } },
                        sequelize.where(
                            sequelize.fn('array_length', sequelize.col('reviewer_ids'), 1),
                            { [Op.lt]: 2 }
                        )
                    ]
                }
            }),
            // Awaiting Reviews - Reviewers assigned but reviews not complete
            Manuscript.count({
                where: {
                    category,
                    status: 'Under Review'
                }
            }),
            // Ready for Decision - All reviews complete
            Manuscript.count({
                where: {
                    category,
                    status: { [Op.in]: ['Under Review', 'Editor Review'] },
                    editor_submitted_to_eic: false
                },
                include: [{
                    model: AssignReviewer,
                    as: 'assignments',
                    required: true,
                    where: {
                        status: 'completed'
                    }
                }]
            }),
            // Total manuscripts in category
            Manuscript.count({
                where: { category }
            })
        ]);

        res.json({
            success: true,
            new_submissions: newSubmissions,
            needs_reviewers: needsReviewers,
            awaiting_reviews: awaitingReviews,
            ready_for_decision: readyForDecision,
            total_manuscripts: totalManuscripts,
            category: editor.assigned_category
        });
    } catch (error) {
        console.error('Editor Stats Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getManuscripts = async (req, res) => {
    try {
        const { search = "", status, manuscript_type, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const user_id = req.user.id;

        const editor = await Editor.findOne({ where: { user_id } });
        if (!editor) return res.status(404).json({ message: 'Editor profile not found' });

        const whereClause = { category: editor.assigned_category };

        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { abstract: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (status) whereClause.status = status;
        if (manuscript_type) whereClause.manuscript_type = manuscript_type;

        const { rows, count } = await Manuscript.findAndCountAll({
            where: whereClause,
            limit: Number(limit),
            offset: Number(offset),
            include: [{
                model: AssignReviewer,
                as: 'assignments',
                required: false,
                where: { status: { [Op.notIn]: ['rejected'] } }
            }],
            distinct: true, // Important when using include with findAndCountAll
            // order: [['createdAt', 'DESC']],
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                totalItems: count,
                currentPage: Number(page),
                totalPages: Math.ceil(count / limit),
            },
            message: 'getAllManuscripts successful',
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getManuscriptsById = async (req, res) => {
    try {
        const manuscript_id = req.params.id;
        const user_id = req.user.id;

        // Verify editor has access to this manuscript's category
        const editor = await Editor.findOne({ where: { user_id } });
        if (!editor) {
            return res.status(404).json({ message: 'Editor profile not found' });
        }

        const manuscript = await Manuscript.findByPk(manuscript_id, {
            include: [
                {
                    model: Author,
                    as: 'author',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['first_name', 'last_name', 'email', 'prefix']
                    }]
                },
                {
                    model: Review,
                    as: 'reviews',
                    include: [{
                        model: Reviewer,
                        as: 'reviewer',
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['first_name', 'last_name', 'prefix']
                        }]
                    }]
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
                            attributes: ['first_name', 'last_name', 'prefix']
                        }]
                    }]
                }
            ]
        });

        if (!manuscript) {
            return res.status(404).json({ message: 'Manuscript Not Found' });
        }

        // Verify manuscript is in editor's category (case-insensitive)
        const manuscriptCat = (manuscript.category || '').toLowerCase();
        const editorCat = (editor.assigned_category || '').toLowerCase();
        
        if (manuscriptCat !== editorCat) {
            console.log('Category mismatch:', { manuscript_category: manuscript.category, editor_category: editor.assigned_category });
            return res.status(403).json({ 
                message: 'You do not have permission to view this manuscript',
                details: { manuscript_category: manuscript.category, editor_category: editor.assigned_category }
            });
        }

        res.json({
            data: manuscript,
            message: 'Successful getManuscriptById Execution',
        });
    } catch (error) {
        console.error('getManuscriptsById Error:', error);
        res.status(500).json({
            message: error.message,
        });
    }
};

export const getAllReviewers = async (req, res, next) => {
    try {
        const { search = "", availability, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const editor_id = req.user.id;
        const editor = await Editor.findOne({ where: { user_id: editor_id } });

        if (!editor) {
            return res.status(404).json({ message: 'Editor profile not found' });
        }

        const whereClause = { assigned_category: editor.assigned_category };

        if (search) {
            whereClause[Op.or] = [
                { specialties: { [Op.overlap]: [search] } },
                { assigned_category: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (availability) whereClause.availability_status = availability;

        const { rows, count } = await Reviewer.findAndCountAll({
            where: whereClause,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'last_name', 'email', 'prefix', 'is_active'],
                where: { is_active: true },
                required: true
            }],
            limit: Number(limit),
            offset: Number(offset),
            distinct: true
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                totalItems: count,
                currentPage: Number(page),
                totalPages: Math.ceil(count / limit),
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getReviewerById = async (req, res, next) => {
    try {
        const id = req.params.id;

        const result = await Reviewer.findByPk(id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Reviewer not found' });
        }
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createIssue = async (req, res, next) => {
    try {
        const {
            volume_number,
            issue_number,
            planned_publication_date,
            issue_title,
            description,
            manuscripts_ids,
            final_files_received,
            copyright_agreement_completed,
            metadata_validated
        } = req.body;

        const issue = Issue.create({
            volume_number,
            issue_number,
            planned_publication_date,
            issue_title,
            description,
            manuscripts_ids,
            final_files_received,
            copyright_agreement_completed,
            metadata_validated
        });

        res.status(200).json({ success: true, data: issue });
    } catch (error) {
        res.status(500).json({ messgae: error.message });
        next(error);
    }
};

export const downloadIssueMetaData = async (req, res, next) => {
    try {
        const id = req.params.id;
        const result = await Issue.findByPk(id);
        if (!result) {
            return res.status(404).json({ success: false, message: "Issue not found" });
        }
        const data = JSON.stringify(result, null, 2);

        res.setHeader('Content-disposition', `attachment; filename=issue-${id}-metadata.json`);
        res.setHeader('Content-type', 'application/json');

        res.send(data);

    } catch (error) {
        next(new ApiError(500, error.message));
    }
};

export const handlingManuscriptToEIC = async (req, res, next) => {
    try {
        const id = req.params.id;



        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(new ApiError(500, error.message));
    }
};

// export const assignReviewersInBulk = async (req, res) => {
//     try {
//         const { id, reviewer_array } = req.body;

//         if (!id || !Array.isArray(reviewer_array)) {
//             return res.status(400).json({
//                 message: 'Invalid payload',
//             });
//         }

//         const manuscript = await Manuscript.findByPk(id);

//         if (!manuscript) {
//             return res.status(404).json({
//                 message: 'Manuscript not found',
//             });
//         }

//         const existingReviewers = manuscript.reviewer_ids || [];

//         const updatedReviewers = [
//             ...new Set([...existingReviewers, ...reviewer_array]),
//         ];

//         manuscript.reviewer_ids = updatedReviewers;
//         await manuscript.save();

//         res.json({
//             data: manuscript,
//             message: 'Reviewers assigned successfully',
//         });
//     } catch (error) {
//         res.status(500).json({
//             message: error.message,
//         });
//     }
// };

// export const assignReviewer = async (req, res, next) => {
//     try {
//         const { id, user_id } = req.body;

//         if (!id) {
//             return res.status(400).json({
//                 message: 'Id not found',
//             });
//         }

//         const manuscript = await Manuscript.findByPk(id);

//         if (!manuscript) {
//             return res.status(404).json({
//                 message: 'Manuscript not found',
//             });
//         }

//         const existingReviewers = manuscript.reviewer_ids || [];

//         const updatedReviewers = [...new Set([...existingReviewers, user_id])];

//         manuscript.reviewer_ids = updatedReviewers;
//         await manuscript.save();

//         res.json({
//             data: manuscript,
//             message: 'Reviewers assigned successfully',
//         });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

export const assignReviewersInBulk = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { manuscript_id, reviewer_ids, deadline } = req.body;

        if (
            !manuscript_id ||
            !Array.isArray(reviewer_ids) ||
            reviewer_ids.length === 0 ||
            !deadline
        ) {
            await transaction.rollback();
            return res.status(400).json({
                message: 'manuscript_id, reviewer_ids array and deadline are required',
            });
        }

        // 1️⃣ Check manuscript
        const manuscript = await Manuscript.findByPk(manuscript_id);

        if (!manuscript) {
            await transaction.rollback();
            return res.status(404).json({
                message: 'Manuscript not found',
            });
        }

        // 2️⃣ Get Editor profile
        const editorProfile = await Editor.findOne({
            where: { user_id: req.user.id },
        });

        if (!editorProfile) {
            await transaction.rollback();
            return res.status(403).json({
                message: 'Editor profile not found',
            });
        }

        // 2.5️⃣ Verify manuscript category matches editor's assigned category
        if (manuscript.category !== editorProfile.assigned_category) {
            await transaction.rollback();
            return res.status(403).json({
                message: 'You can only assign reviewers to manuscripts in your assigned category',
            });
        }

        // 3️⃣ Check existing assignments to enforce MAX 3 reviewers limit
        const existingAssignments = await AssignReviewer.findAll({
            where: {
                manuscript_id,
                manuscript_version: manuscript.version || 1,
                status: { [Op.notIn]: ['rejected'] } // Don't count rejected assignments
            },
        });

        const currentReviewerCount = existingAssignments.length;
        const maxReviewers = manuscript.max_reviewer_limit || 3;
        
        if (currentReviewerCount >= maxReviewers) {
            await transaction.rollback();
            return res.status(400).json({
                message: `Maximum ${maxReviewers} reviewers already assigned for this manuscript`,
            });
        }

        const availableSlots = maxReviewers - currentReviewerCount;
        
        if (reviewer_ids.length > availableSlots) {
            await transaction.rollback();
            return res.status(400).json({
                message: `Only ${availableSlots} reviewer slot(s) available. You are trying to assign ${reviewer_ids.length} reviewers.`,
            });
        }

        // 4️⃣ Validate reviewers exist AND match the manuscript's category (assigned_category)
        const reviewers = await Reviewer.findAll({
            where: { 
                id: reviewer_ids,
                assigned_category: manuscript.category // Only reviewers with matching category
            },
        });

        if (reviewers.length !== reviewer_ids.length) {
            await transaction.rollback();
            return res.status(400).json({
                message: 'One or more reviewers not found or do not match the manuscript category',
            });
        }

        // 5️⃣ Filter already assigned reviewers for this version
        const alreadyAssignedReviewerIds = existingAssignments.map(
            (a) => a.reviewer_id
        );

        const reviewersToAssign = reviewer_ids.filter(
            (id) => !alreadyAssignedReviewerIds.includes(id)
        );

        if (reviewersToAssign.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                message: 'All reviewers already assigned for this version',
            });
        }

        // 6️⃣ Create assignments
        const assignments = await Promise.all(
            reviewersToAssign.map((reviewer_id) =>
                AssignReviewer.create(
                    {
                        manuscript_id,
                        reviewer_id,
                        assigned_by: editorProfile.id,
                        manuscript_version: manuscript.version || 1,
                        deadline,
                        status: 'assigned',
                    },
                    { transaction }
                )
            )
        );

        // 7️⃣ Update manuscript status if reviewers assigned
        if (assignments.length > 0 && manuscript.status === 'Submitted') {
            manuscript.status = 'Under Review';
            await manuscript.save({ transaction });
        }

        await transaction.commit();

        return res.status(201).json({
            message: 'Reviewers assigned successfully',
            assigned_count: assignments.length,
            max_reviewers: maxReviewers,
            total_assigned: currentReviewerCount + assignments.length,
            assignments,
        });
    } catch (error) {
        await transaction.rollback();
        return res.status(500).json({
            message: error.message,
        });
    }
};

export const assignReviewer = async (req, res) => {
    try {
        const { manuscript_id, user_id, deadline } = req.body;

        if (!manuscript_id || !user_id || !deadline) {
            return res.status(400).json({
                message: 'manuscript_id, user_id and deadline are required',
            });
        }

        // check manuscript
        const manuscript = await Manuscript.findByPk(manuscript_id);
        if (!manuscript) {
            return res.status(404).json({ message: 'Manuscript not found' });
        }

        // Get editor profile
        const editorProfile = await Editor.findOne({
            where: { user_id: req.user.id }
        });

        if (!editorProfile) {
            return res.status(403).json({ message: 'Editor profile not found' });
        }

        // Verify manuscript category matches editor's assigned category
        if (manuscript.category !== editorProfile.assigned_category) {
            return res.status(403).json({
                message: 'You can only assign reviewers to manuscripts in your assigned category'
            });
        }

        // Check reviewer exists and matches category
        const reviewer = await Reviewer.findOne({ 
            where: { 
                user_id: user_id,
                assigned_category: manuscript.category 
            } 
        });
        if (!reviewer) {
            return res.status(404).json({ 
                message: 'Reviewer not found or does not match manuscript category' 
            });
        }

        // Check existing assignments to enforce MAX 3 reviewers limit
        const existingAssignments = await AssignReviewer.count({
            where: {
                manuscript_id,
                manuscript_version: manuscript.version || 1,
                status: { [Op.notIn]: ['rejected'] }
            }
        });

        const maxReviewers = manuscript.max_reviewer_limit || 3;
        if (existingAssignments >= maxReviewers) {
            return res.status(400).json({
                message: `Maximum ${maxReviewers} reviewers already assigned for this manuscript`
            });
        }

        // Check if reviewer is already assigned
        const alreadyAssigned = await AssignReviewer.findOne({
            where: {
                manuscript_id,
                reviewer_id: reviewer.id,
                manuscript_version: manuscript.version || 1
            }
        });

        if (alreadyAssigned) {
            return res.status(400).json({
                message: 'Reviewer is already assigned to this manuscript'
            });
        }

        // create assignment
        const assignment = await AssignReviewer.create({
            manuscript_id: manuscript_id,
            reviewer_id: reviewer.id,
            assigned_by: editorProfile.id,
            manuscript_version: manuscript.version || 1,
            deadline: deadline,
            status: 'assigned',
        });

        // Update manuscript status if first reviewer assigned
        if (manuscript.status === 'Submitted') {
            manuscript.status = 'Under Review';
            await manuscript.save();
        }

        res.json({
            message: 'Reviewer assigned successfully',
            assignment,
            total_assigned: existingAssignments + 1,
            max_reviewers: maxReviewers
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Editor submits final decision to Editor-in-Chief
 */
export const submitToEIC = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            decision, // 'direct_publication', 'minor_revision', 'major_revision', 'reject'
            decision_letter,
            internal_notes
        } = req.body;

        const userId = req.user.id;

        // Find editor profile
        const editor = await Editor.findOne({ where: { user_id: userId } });
        if (!editor) {
            return res.status(403).json({ message: 'Editor profile not found' });
        }

        const manuscript = await Manuscript.findByPk(id);
        if (!manuscript) {
            return res.status(404).json({ message: 'Manuscript not found' });
        }

        // Verify manuscript category matches editor's assigned category
        if (manuscript.category !== editor.assigned_category) {
            return res.status(403).json({
                message: 'You can only handle manuscripts in your assigned category'
            });
        }

        // Check if all assigned reviewers have completed their reviews
        const pendingReviews = await AssignReviewer.count({
            where: {
                manuscript_id: id,
                status: { [Op.notIn]: ['completed', 'rejected'] }
            }
        });

        if (pendingReviews > 0) {
            return res.status(400).json({
                message: 'Cannot submit to EIC until all reviewers have completed their reviews'
            });
        }

        // Store editor's final decision
        manuscript.editor_final_decision = {
            decision,
            letter: decision_letter,
            internal_notes,
            submitted_at: new Date(),
            editor_id: editor.id
        };

        manuscript.editor_submitted_to_eic = true;
        manuscript.status = 'Editor Review';

        await manuscript.save();

        res.json({
            data: manuscript,
            message: 'Manuscript submitted to Editor-in-Chief successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};