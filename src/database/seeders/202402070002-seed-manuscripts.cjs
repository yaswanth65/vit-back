'use strict';
const { v4: uuidv4 } = require('uuid');

/**
 * Seed file for manuscripts, assignments, and reviews
 * Creates a realistic dataset for testing Editor, Reviewer, and EIC workflows
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, get the existing author and reviewer IDs from DB
    const [authors] = await queryInterface.sequelize.query(
      `SELECT a.id, a.user_id, u.email FROM authors a JOIN users u ON a.user_id = u.id;`
    );
    
    const [reviewers] = await queryInterface.sequelize.query(
      `SELECT r.id, r.user_id, u.first_name, u.last_name, r.assigned_category FROM reviewers r JOIN users u ON r.user_id = u.id;`
    );
    
    const [editors] = await queryInterface.sequelize.query(
      `SELECT e.id, e.user_id, e.assigned_category FROM editors e;`
    );

    if (authors.length === 0 || reviewers.length === 0 || editors.length === 0) {
      console.log('Please run the users seed first!');
      return;
    }

    // Find Yaswanth's author ID  
    const yaswanthAuthor = authors.find(a => a.email === 'yaswanth.kancharla65@gmail.com');
    const primaryAuthorId = yaswanthAuthor ? yaswanthAuthor.id : authors[0].id;

    // Get editors by category
    const getEditorByCategory = (category) => editors.find(e => e.assigned_category === category);
    
    // Get random reviewers
    const getRandomReviewers = (count) => {
      const shuffled = [...reviewers].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    };

    const categories = ['Medicine', 'Oncology', 'Neurology', 'Surgery', 'Genetics', 'Cardiology'];
    const manuscriptTypes = ['Original Research', 'Review Article', 'Case Study', 'Clinical Trial', 'Meta-Analysis'];
    const statuses = ['Submitted', 'Editor Review', 'Under Review', 'Revision Required', 'Accepted', 'Published', 'Rejected'];

    const now = new Date();
    const getRandomPastDate = (daysBack) => {
      const date = new Date(now);
      date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
      return date;
    };
    const getFutureDate = (daysAhead) => {
      const date = new Date(now);
      date.setDate(date.getDate() + daysAhead);
      return date;
    };

    // Create manuscript data
    const manuscripts = [];
    const assignments = [];
    const reviews = [];

    // Sample research titles
    const sampleTitles = [
      { title: 'Efficacy of Novel Anticoagulant Therapy in Atrial Fibrillation: A Randomized Controlled Trial', category: 'Cardiology' },
      { title: 'Machine Learning Applications in Early Cancer Detection: A Systematic Review', category: 'Oncology' },
      { title: 'Neural Plasticity in Post-Stroke Recovery: New Therapeutic Approaches', category: 'Neurology' },
      { title: 'Minimally Invasive Surgical Techniques for Spinal Disorders', category: 'Surgery' },
      { title: 'CRISPR-Cas9 Gene Editing: Clinical Applications and Ethical Considerations', category: 'Genetics' },
      { title: 'Telemedicine in Rural Healthcare: A Comprehensive Analysis', category: 'Medicine' },
      { title: 'Immunotherapy Advances in Melanoma Treatment', category: 'Oncology' },
      { title: 'Cognitive Behavioral Therapy for Chronic Pain Management', category: 'Medicine' },
      { title: 'Robotic-Assisted Cardiac Surgery: Outcomes and Complications', category: 'Surgery' },
      { title: 'Genetic Markers for Alzheimer\'s Disease Prediction', category: 'Genetics' },
      { title: 'Novel Drug Delivery Systems for Chemotherapy', category: 'Oncology' },
      { title: 'Deep Brain Stimulation in Parkinson\'s Disease: Long-term Outcomes', category: 'Neurology' },
      { title: 'Personalized Medicine in Cardiovascular Disease Prevention', category: 'Cardiology' },
      { title: 'Stem Cell Therapy for Spinal Cord Injury: A Meta-Analysis', category: 'Surgery' },
      { title: 'AI-Assisted Diagnosis in Radiology: Current State and Future Prospects', category: 'Medicine' },
    ];

    // Create 15 manuscripts
    for (let i = 0; i < 15; i++) {
      const manuscript = sampleTitles[i];
      const manuscriptId = uuidv4();
      const category = manuscript.category;
      const editor = getEditorByCategory(category);
      
      // Determine status based on index to get variety
      let status;
      let editorSubmittedToEic = false;
      let eicDecision = 'Pending';
      
      if (i < 3) {
        status = 'Submitted'; // New submissions
      } else if (i < 5) {
        status = 'Editor Review'; // Editor looking at them
      } else if (i < 8) {
        status = 'Under Review'; // With reviewers
      } else if (i < 10) {
        status = 'Under Review';
        editorSubmittedToEic = true; // Ready for EIC decision
      } else if (i < 12) {
        status = 'Revision Required';
        eicDecision = 'Major Revision';
      } else if (i < 14) {
        status = 'Accepted';
        editorSubmittedToEic = true;
        eicDecision = 'Accept';
      } else {
        status = 'Published';
        editorSubmittedToEic = true;
        eicDecision = 'Accept';
      }

      const authorId = i === 0 ? primaryAuthorId : authors[i % authors.length].id;

      manuscripts.push({
        id: manuscriptId,
        author_id: authorId,
        title: manuscript.title,
        abstract: `This is a comprehensive study examining ${manuscript.title.toLowerCase()}. Our research presents groundbreaking findings that have significant implications for clinical practice. The methodology employed rigorous scientific standards with a sample size of ${100 + i * 50} participants. Our results demonstrate statistically significant outcomes (p < 0.05) supporting our hypothesis.`,
        keywords: ['research', category.toLowerCase(), 'clinical', 'study'],
        category: category,
        manuscript_type: manuscriptTypes[i % manuscriptTypes.length],
        status: status,
        version: 1,
        main_file: JSON.stringify({ url: `https://example.com/files/manuscript-${i + 1}.docx`, originalname: `manuscript-${i + 1}.docx`, mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        cover_letter: JSON.stringify({ url: `https://example.com/files/cover-${i + 1}.pdf`, textContent: 'Dear Editor, We are pleased to submit our manuscript...' }),
        supplementary_files: JSON.stringify([]),
        declarations: JSON.stringify({ hasEthicsApproval: true, hasConflictOfInterest: false, isOriginalWork: true, fundingSource: 'National Research Foundation' }),
        authors: JSON.stringify([
          { firstName: 'Primary', lastName: 'Author', email: 'primary@example.com', affiliation: 'University Medical Center', isCorresponding: true },
          { firstName: 'Co', lastName: 'Author', email: 'co@example.com', affiliation: 'Research Institute', isCorresponding: false }
        ]),
        editor_submitted_to_eic: editorSubmittedToEic,
        eic_decision: eicDecision,
        eic_decision_note: editorSubmittedToEic && eicDecision !== 'Pending' ? 'Decision has been made based on reviewer feedback.' : null,
        eic_decision_date: eicDecision !== 'Pending' ? getRandomPastDate(7) : null,
        max_reviewer_limit: 3,
        reviewer_ids: [],
        created_at: getRandomPastDate(60),
        updated_at: getRandomPastDate(10),
      });

      // Create reviewer assignments for manuscripts in review
      if (['Under Review', 'Revision Required', 'Accepted', 'Published'].includes(status)) {
        const assignedReviewers = getRandomReviewers(3);
        const reviewerIds = [];

        assignedReviewers.forEach((reviewer, idx) => {
          const assignId = uuidv4();
          const assignStatus = status === 'Under Review' && idx === 2 ? 'in_review' : 'completed';
          
          reviewerIds.push(reviewer.id);

          assignments.push({
            assign_reviewer_id: assignId,
            manuscript_id: manuscriptId,
            reviewer_id: reviewer.id,
            assigned_by: editor ? editor.id : null,
            manuscript_version: 1,
            deadline: getFutureDate(14 + idx * 7),
            status: assignStatus,
            created_at: getRandomPastDate(30),
            updated_at: getRandomPastDate(5),
          });

          // Create reviews for completed assignments
          if (assignStatus === 'completed' || (idx < 2 && status !== 'Submitted')) {
            const recommendations = ['Accept', 'Minor Revision', 'Major Revision', 'Reject'];
            reviews.push({
              id: uuidv4(),
              assign_reviewer_id: assignId,
              manuscript_id: manuscriptId,
              reviewer_id: reviewer.id,
              originality_score: Math.floor(Math.random() * 2) + 4, // 4-5
              methodology_score: Math.floor(Math.random() * 2) + 3, // 3-4
              significance_score: Math.floor(Math.random() * 2) + 4, // 4-5
              clarity_score: Math.floor(Math.random() * 3) + 3, // 3-5
              language_score: Math.floor(Math.random() * 2) + 4, // 4-5
              comments_to_author: `This manuscript presents interesting research on ${category}. The methodology is sound and the results are clearly presented. Minor revisions are suggested to improve clarity in certain sections. The statistical analysis could benefit from additional detail.`,
              confidential_comments_to_editor: `I recommend this manuscript for publication with minor revisions. The research is significant and adds value to the field. The authors should address the methodological concerns raised.`,
              recommendation: recommendations[idx % 4],
              status: 'Submitted',
              annotations: JSON.stringify([]),
              created_at: getRandomPastDate(20),
              updated_at: getRandomPastDate(3),
            });
          }
        });

        // Update manuscript with reviewer_ids
        manuscripts[manuscripts.length - 1].reviewer_ids = reviewerIds;
      }
    }

    // Insert manuscripts using raw SQL for proper array casting
    for (const m of manuscripts) {
      const reviewerIdsArray = m.reviewer_ids.length > 0 
        ? `ARRAY[${m.reviewer_ids.map(id => `'${id}'`).join(', ')}]::uuid[]`
        : `ARRAY[]::uuid[]`;
      
      const keywordsArray = m.keywords.length > 0
        ? `ARRAY[${m.keywords.map(k => `'${k}'`).join(', ')}]`
        : `ARRAY[]::varchar[]`;

      await queryInterface.sequelize.query(`
        INSERT INTO manuscripts (
          id, author_id, title, abstract, keywords, category, manuscript_type, 
          status, version, main_file, cover_letter, supplementary_files, 
          declarations, authors, editor_submitted_to_eic, eic_decision, 
          eic_decision_note, eic_decision_date, max_reviewer_limit, reviewer_ids, 
          created_at, updated_at
        ) VALUES (
          '${m.id}', '${m.author_id}', '${m.title.replace(/'/g, "''")}', 
          '${m.abstract.replace(/'/g, "''")}', ${keywordsArray}, '${m.category}', 
          '${m.manuscript_type}', '${m.status}', ${m.version}, 
          '${m.main_file.replace(/'/g, "''")}'::jsonb, 
          '${m.cover_letter.replace(/'/g, "''")}'::jsonb, 
          '${m.supplementary_files}'::jsonb, 
          '${m.declarations}'::jsonb, 
          '${m.authors.replace(/'/g, "''")}'::jsonb, 
          ${m.editor_submitted_to_eic}, '${m.eic_decision}', 
          ${m.eic_decision_note ? `'${m.eic_decision_note}'` : 'NULL'}, 
          ${m.eic_decision_date ? `'${m.eic_decision_date.toISOString()}'` : 'NULL'}, 
          ${m.max_reviewer_limit}, ${reviewerIdsArray}, 
          '${m.created_at.toISOString()}', '${m.updated_at.toISOString()}'
        )
      `);
    }
    console.log(`Inserted ${manuscripts.length} manuscripts`);

    // Insert assignments
    if (assignments.length > 0) {
      await queryInterface.bulkInsert('assign_reviewers', assignments);
      console.log(`Inserted ${assignments.length} reviewer assignments`);
    }

    // Insert reviews
    if (reviews.length > 0) {
      await queryInterface.bulkInsert('reviews', reviews);
      console.log(`Inserted ${reviews.length} reviews`);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('reviews', null, {});
    await queryInterface.bulkDelete('assign_reviewers', null, {});
    await queryInterface.bulkDelete('manuscripts', null, {});
    console.log('Deleted all manuscripts, assignments, and reviews');
  }
};
