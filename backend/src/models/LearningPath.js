import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  timestamp: Number,
  concept: String,
  summary: String,
  difficultyScore: Number
});

const resourceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['url', 'text', 'pdf', 'video', 'youtube', 'pdf_link'],
    required: true
  },
  content: { type: String, required: true },
  title: String,
  videoId: String,
  milestones: [milestoneSchema]
});

const quizQuestionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  correctAnswerIndex: Number,
  explanation: String
});

const studyModuleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  estimatedMinutes: Number,
  isCompleted: { type: Boolean, default: false },
  resources: [resourceSchema],
  keyConcepts: [String],
  dependsOnModuleIds: [String],
  userNotes: String,
  generatedContent: String
});

const learningPhaseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  modules: [studyModuleSchema],
  order: Number
});

const learningPathSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  goal: { type: String, required: true },
  expectedOutcome: String,
  createdAt: { type: Date, default: Date.now },
  targetDate: Date,
  dailyCommitmentMinutes: Number,
  preferredStartTime: String,
  phases: [learningPhaseSchema],
  sessions: [{
    id: String,
    pathId: String,
    moduleId: String,
    title: String,
    startTime: Date,
    endTime: Date,
    isCompleted: { type: Boolean, default: false }
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  progress: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('LearningPath', learningPathSchema);
