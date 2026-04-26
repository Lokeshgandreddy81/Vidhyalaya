
export interface Resource {
  id: string;
  type: 'url' | 'text' | 'pdf' | 'video' | 'youtube' | 'pdf_link';
  content: string; // URL or text content
  title?: string;
  videoId?: string; // For YouTube embeds
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface StudyModule {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  isCompleted: boolean;
  resources: Resource[];
  keyConcepts: string[];
  dependsOnModuleIds: string[];
  userNotes?: string;
  generatedContent?: string;
}

export interface LearningPhase {
  id: string;
  title: string;
  description: string;
  modules: StudyModule[];
  order: number;
}

export interface LearningPath {
  id: string;
  title: string;
  goal: string;
  expectedOutcome?: string;
  createdAt: string;
  targetDate?: string;
  dailyCommitmentMinutes: number;
  phases: LearningPhase[];
  status: 'active' | 'completed' | 'archived';
  progress: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  condition: 'first_module' | 'first_path' | 'quiz_master' | 'streak_7';
}

export interface UserProfile {
  name: string;
  email: string;
  xp: number;
  level: number;
  streakDays: number;
  joinedAt: string;
}