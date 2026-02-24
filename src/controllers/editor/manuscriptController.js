// controllers/editor/manuscriptController.js
import { Editor, Issue, Manuscript, Reviewer, AssignReviewer } from '../../database/models/index.js';
import { uploadToR2, deleteFromR2 } from '../../services/r2Services.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';

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
        const manuscript = await Manuscript.findByPk(manuscript_id);
        if (!manuscript) {
            return res.status(404).json({ message: 'Manuscript Not Found' });
        }

        res.json({
            data: manuscript,
            message: 'Successfull getManuscriptById Execution',
        });
    } catch (error) {
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
        const editor = await Editor.findOne({ where: { user_id: editor_id } }); // Assuming Editor model check

        const whereClause = { assigned_category: editor.assigned_category };

        if (search) {
            whereClause[Op.or] = [
                { specialties: { [Op.overlap]: [search] } }, // Search within array
                { assigned_category: { [Op.iLike]: `%${search}%` } }
            ];
        }

        if (availability) whereClause.availability_status = availability;

        const { rows, count } = await Reviewer.findAndCountAll({
            where: whereClause,
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

        // 2️⃣ Get Editor profile (IMPORTANT FIX)
        const editorProfile = await Editor.findOne({
            where: { user_id: req.user.id },
        });

        if (!editorProfile) {
            await transaction.rollback();
            return res.status(403).json({
                message: 'Editor profile not found',
            });
        }

        // 3️⃣ Validate reviewers exist
        const reviewers = await Reviewer.findAll({
            where: { id: reviewer_ids },
        });

        if (reviewers.length !== reviewer_ids.length) {
            await transaction.rollback();
            return res.status(400).json({
                message: 'One or more reviewers not found',
            });
        }

        // 4️⃣ Filter already assigned reviewers for this version
        const existingAssignments = await AssignReviewer.findAll({
            where: {
                manuscript_id,
                manuscript_version: manuscript.current_version || 1,
            },
        });

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

        // 5️⃣ Create assignments
        const assignments = await Promise.all(
            reviewersToAssign.map((reviewer_id) =>
                AssignReviewer.create(
                    {
                        manuscript_id,
                        reviewer_id,
                        assigned_by: editorProfile.id,
                        manuscript_version: manuscript.current_version || 1,
                        deadline,
                        status: 'assigned',
                    },
                    { transaction }
                )
            )
        );

        await transaction.commit();

        return res.status(201).json({
            message: 'Reviewers assigned successfully',
            assigned_count: assignments.length,
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
        // const editorId = req.user?.id || req.body.assigned_by;

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

        // check reviewer exists
        // const reviewer = await Reviewer.findByPk(user_id);
        const reviewer = await Reviewer.findOne({ where: { user_id: user_id } });
        if (!reviewer) {
            return res.status(404).json({ message: 'Reviewer not found' });
        }

        const editorProfile = await Editor.findOne({
            where: { user_id: req.user.id }
        });

        if (!editorProfile) {
            return res.status(403).json({ message: 'Editor profile not found' });
        }

        // create assignment
        const assignment = await AssignReviewer.create({
            manuscript_id: manuscript_id,
            reviewer_id: reviewer.id,
            // assigned_by: editorId,
            assigned_by: editorProfile.id,
            manuscript_version: manuscript.current_version || 1,
            deadline: deadline,
            status: 'assigned',
        });

        res.json({
            message: 'Reviewer assigned successfully',
            assignment,
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