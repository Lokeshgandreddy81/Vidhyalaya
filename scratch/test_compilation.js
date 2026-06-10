import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

import { generateLearningPlan } from '../backend/src/services/learningPlanService.js';
import { generateKnowledgeGraph } from '../backend/src/services/knowledgeGraphService.js';

async function audit() {
  const goal = "Learn Corporate Finance Valuation";
  console.log(`Auditing synthesis for goal: "${goal}"`);
  
  const mockReq = {
    headers: {
      'x-byok-mode': 'auto'
    }
  };

  try {
    console.log('\n--- 1. Generating Learning Plan ---');
    const plan = await generateLearningPlan({
      goal,
      skillLevel: 'beginner',
      dailyCommitment: 45,
      expectedOutcome: 'Mastery',
      mode: 'preview',
      req: mockReq
    });

    console.log('Synthesized Learning Plan Title:', plan.title);
    console.log('Description:', plan.description);
    console.log('Phases count:', plan.phases?.length);
    
    if (plan.phases && plan.phases.length > 0) {
      plan.phases.forEach((p, idx) => {
        console.log(`\nPhase ${idx + 1}: ${p.title}`);
        p.modules?.forEach((m, mIdx) => {
          console.log(`  Module ${mIdx + 1}: ${m.title}`);
          console.log(`    Concepts: ${JSON.stringify(m.keyConcepts)}`);
        });
      });
      
      const firstModule = plan.phases[0].modules[0];
      console.log('\n--- 2. Generating Knowledge Graph for first module ---');
      console.log(`Module Title: "${firstModule.title}"`);
      console.log(`Concepts:`, firstModule.keyConcepts);

      const graph = await generateKnowledgeGraph({
        moduleTitle: firstModule.title,
        concepts: firstModule.keyConcepts,
        content: '', // no content excerpt, simulate initial map load
        studyLens: 'roadmap',
        scholarPersona: 'visionary',
        cognitiveDensity: 'overview',
        req: mockReq
      });

      console.log('\nGenerated Knowledge Graph Topic:', graph.topic);
      console.log('Nodes:');
      graph.nodes?.forEach(n => console.log(`  [Level ${n.level}] ${n.label} - ${n.description?.substring(0, 50)}...`));
      console.log('Edges Count:', graph.edges?.length);
      console.log('Learning Path:', graph.learningPath);
    }
  } catch (err) {
    console.error('Audit failed with error:', err);
  }
}

audit();
