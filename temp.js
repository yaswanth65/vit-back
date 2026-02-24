export const assignReviewer = async (req, res) => {
    try {
        const { id: manuscript_id, reviewer_id, deadline } = req.body;
        const editorId = req.user?.id || req.body.assigned_by;

        if (!manuscript_id || !reviewer_id || !deadline) {
            return res.status(400).json({
                message: 'manuscript_id, reviewer_id and deadline are required',
            });
        }

        // check manuscript
        const manuscript = await Manuscript.findByPk(manuscript_id);
        if (!manuscript) {
            return res.status(404).json({ message: 'Manuscript not found' });
        }

        // check reviewer exists
        const reviewer = await Reviewer.findByPk(reviewer_id);
        if (!reviewer) {
            return res.status(404).json({ message: 'Reviewer not found' });
        }

        // create assignment
        const assignment = await AssignReviewer.create({
            manuscript_id,
            reviewer_id,
            assigned_by: editorId,
            manuscript_version: manuscript.current_version || 1,
            deadline,
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