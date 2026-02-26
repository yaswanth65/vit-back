import sequelize from './src/config/database.js';
import { User, Author, Editor, Reviewer, EditorInChief, Manuscript, Review, AssignReviewer } from './src/database/models/index.js';

async function getDatabaseSummary() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Get all users with their roles
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📋 ALL USERS IN SYSTEM');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        const users = await User.findAll({
            include: [
                { model: Author, as: 'authorProfile' },
                { model: Reviewer, as: 'reviewerProfile', attributes: ['id', 'assigned_category', 'specialties', 'expertise_areas', 'availability_status'] },
                { model: Editor, as: 'editorProfile', attributes: ['id', 'assigned_category', 'primary_specialty'] },
                { model: EditorInChief, as: 'eicProfile', attributes: ['id'] },
            ],
            order: [['id', 'ASC']]
        });

        users.forEach((user, idx) => {
            const roles = [];
            if (user.authorProfile) roles.push('AUTHOR');
            if (user.reviewerProfile) roles.push('REVIEWER');
            if (user.editorProfile) roles.push('EDITOR');
            if (user.eicProfile) roles.push('EIC');

            console.log(`${idx + 1}. ${user.prefix || ''} ${user.first_name} ${user.last_name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role(s): ${roles.join(', ')}`);
            
            if (user.authorProfile) {
                console.log(`   └─ Author`);
            }
            if (user.reviewerProfile) {
                console.log(`   └─ Reviewer - Category: ${user.reviewerProfile.assigned_category}`);
                console.log(`      Availability: ${user.reviewerProfile.availability_status || 'Not set'}`);
                console.log(`      Expertise: ${user.reviewerProfile.expertise_areas?.join(', ') || 'Not set'}`);
            }
            if (user.editorProfile) {
                console.log(`   └─ Editor - Category: ${user.editorProfile.assigned_category}`);
                console.log(`      Specialty: ${user.editorProfile.primary_specialty || 'Not set'}`);
            }
            if (user.eicProfile) {
                console.log(`   └─ Editor-in-Chief`);
            }
            console.log();
        });

        // Get manuscripts summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📄 ALL MANUSCRIPTS');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const manuscripts = await Manuscript.findAll({
            include: [
                { 
                    model: Author, 
                    as: 'author',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['first_name', 'last_name']
                    }]
                },
                {
                    model: AssignReviewer,
                    as: 'assignments'
                }
            ]
        });

        manuscripts.forEach((ms, idx) => {
            console.log(`${idx + 1}. "${ms.title}"`);
            console.log(`   ID: ${ms.id}`);
            console.log(`   Author: ${ms.author?.user?.first_name} ${ms.author?.user?.last_name}`);
            console.log(`   Category: ${ms.category}`);
            console.log(`   Type: ${ms.manuscript_type}`);
            console.log(`   Status: ${ms.status}`);
            console.log(`   Version: ${ms.version}`);
            console.log(`   Max Reviewers: ${ms.max_reviewer_limit || 3}`);
            console.log(`   Assigned Reviewers: ${ms.assignments?.length || 0}`);
            console.log(`   Submitted to EIC: ${ms.editor_submitted_to_eic ? 'YES' : 'NO'}`);
            console.log();
        });

        // Get categories summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🏷️  CATEGORIES BREAKDOWN');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const categories = new Set();
        users.forEach(u => {
            if (u.reviewerProfile?.assigned_category) categories.add(u.reviewerProfile.assigned_category);
            if (u.editorProfile?.assigned_category) categories.add(u.editorProfile.assigned_category);
        });
        manuscripts.forEach(m => categories.add(m.category));

        for (const cat of Array.from(categories).sort()) {
            const authorsInCat = manuscripts.filter(m => m.category === cat).map(m => m.author?.user).filter(Boolean);
            const reviewersInCat = users.filter(u => u.reviewerProfile?.assigned_category === cat);
            const editorsInCat = users.filter(u => u.editorProfile?.assigned_category === cat);
            const manuscriptsInCat = manuscripts.filter(m => m.category === cat);

            console.log(`📁 ${cat}`);
            console.log(`   Authors: ${authorsInCat.length}`);
            authorsInCat.forEach(u => console.log(`      • ${u.first_name} ${u.last_name}`));
            console.log(`   Editors: ${editorsInCat.length}`);
            editorsInCat.forEach(u => console.log(`      • ${u.first_name} ${u.last_name}`));
            console.log(`   Reviewers: ${reviewersInCat.length}`);
            reviewersInCat.forEach(u => console.log(`      • ${u.first_name} ${u.last_name}`));
            console.log(`   Manuscripts: ${manuscriptsInCat.length}`);
            manuscriptsInCat.forEach(m => console.log(`      • "${m.title}" (${m.status})`));
            console.log();
        }

        // Review assignments summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('👥 REVIEW ASSIGNMENTS DETAIL');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const assignments = await AssignReviewer.findAll({
            include: [
                {
                    model: Manuscript,
                    as: 'manuscript',
                    attributes: ['title', 'category']
                }
            ]
        });

        if (assignments.length === 0) {
            console.log('No review assignments yet\n');
        } else {
            assignments.forEach((assign, idx) => {
                console.log(`${idx + 1}. Manuscript: "${assign.manuscript.title}"`);
                console.log(`   Reviewer ID: ${assign.reviewer_id}`);
                console.log(`   Category: ${assign.manuscript.category}`);
                console.log(`   Status: ${assign.status}`);
                console.log(`   Deadline: ${assign.deadline ? new Date(assign.deadline).toLocaleDateString() : 'Not set'}`);
                console.log();
            });
        }

        // Review summary
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('⭐ REVIEW SUBMISSIONS');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const reviewCount = await Review.count();
        const submittedReviewCount = await Review.count({
            where: { status: 'Submitted' }
        });

        console.log(`Total Reviews: ${reviewCount}`);
        console.log(`Submitted Reviews: ${submittedReviewCount}`);
        console.log(`Draft Reviews: ${reviewCount - submittedReviewCount}\n`);

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ SUMMARY COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════\n');

        console.log(`Total Users: ${users.length}`);
        console.log(`Total Manuscripts: ${manuscripts.length}`);
        console.log(`Total Categories: ${categories.size}`);
        console.log(`Total Review Assignments: ${assignments.length}`);
        console.log(`Total Reviews Submitted: ${submittedReviewCount}`);
        console.log(`Total Reviews (Submitted + Draft): ${reviewCount}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

getDatabaseSummary();
