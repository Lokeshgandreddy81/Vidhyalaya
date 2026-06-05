
export interface ContentCitation {
  index: number;    // [1], [2] inline marker
  title: string;    // Page title from Google grounding
  url: string;      // Source URL
  domain?: string;  // Derived domain name for display
  snippet?: string; // Brief excerpt from the source
}

export interface KnowledgeMilestone {
  timestamp: number;
  concept: string;
  summary: string;
  difficultyScore: number;
}

export interface VideoClip {
  videoId: string;
  videoTitle?: string;
  chapterTitle?: string;
  timestamp: number;
  endTimestamp?: number;
  confidence: number;
}

export interface VideoSegment {
  id: string;
  label: string;
  timestamp: number; // primary timestamp
  videoId?: string; // primary video
  clips?: VideoClip[]; // alternative clips
  confidence: number;
}

export interface Resource {
  id: string;
  type: 'url' | 'text' | 'pdf' | 'video' | 'youtube' | 'pdf_link';
  content: string; // URL or text content
  title?: string;
  videoId?: string; // For YouTube embeds
  timeline?: VideoSegment[];
  milestones?: KnowledgeMilestone[];
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
  citations?: ContentCitation[];
  knowledgeGraph?: KnowledgeGraph;
  nodeMastery?: Record<string, MasteryStatus>;
  sandboxState?: SandboxState;
  order: number;
}

// ─── Sandbox ────────────────────────────────────────────────────────────────

export type SandboxLanguage = 'javascript' | 'python';

export interface SandboxFile {
  name: string;
  content: string;
  readOnly?: boolean;
}

export interface SandboxExercise {
  id: string;
  title: string;
  brief: string;
  language: SandboxLanguage;
  starterFiles: SandboxFile[];
  testCode: string;
  hints: string[];
}

export interface SandboxAttempt {
  exerciseId: string;
  passed: boolean;
  attempts: number;
  lastRunAt: number;
}

export interface SandboxState {
  files: Record<string, string>;
  activeFile: string;
  language: SandboxLanguage;
  exerciseIndex: number;
  attempts: Record<string, SandboxAttempt>;
  completedExerciseIds: string[];
}

export interface SandboxRunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  errorLine?: number;
  errorMessage?: string;
  testsPassed?: number;
  testsTotal?: number;
  durationMs: number;
}

export interface SandboxErrorExplanation {
  what: string;
  why: string;
  howToFix: string;
}

export interface SandboxFixProposal {
  file: string;
  original: string;
  fixed: string;
  description: string;
}

export interface LearningPhase {
  id: string;
  title: string;
  description: string;
  modules: StudyModule[];
  order: number;
}

export interface ScheduledSession {
  id: string;
  pathId: string;
  moduleId?: string;
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  isCompleted: boolean;
}

export interface LearningPath {
  id: string;
  userId: string;
  title: string;
  goal: string;
  expectedOutcome?: string;
  createdAt: string;
  targetDate?: string;
  dailyCommitmentMinutes: number;
  preferredStartTime?: string; // e.g., "09:00"
  phases: LearningPhase[];
  sessions?: ScheduledSession[];
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

export interface GeometryAnchor {
  id: string;
  moduleTitle: string;
  label: string;
  kind: 'golden-rule' | 'definition' | 'warning' | 'shape';
  detail: string;
  createdAt: number;
}

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: 'Scholar' | 'Researcher' | 'Architect' | 'CEO' | 'CPO';
  xp: number;
  level: number;
  streakDays: number;
  joinedAt: string;
  achievements?: Achievement[];
  preferences?: {
    aiModel: string;
    theme: 'light' | 'dark' | 'academic';
    focusMode: boolean;
  };
}

export interface SmartboardJumpEventDetail {
  timestamp: number;
  videoId?: string;
}

export interface ScoutedVideo {
  id: string;
  title: string;
  channel?: string;
  label?: string;
  matchScore?: number;
}

// ─── Knowledge Map ───────────────────────────────────────────────────────────

export type DiagramType =
  | 'concept_tree'
  | 'process_flow'
  | 'component_tree'
  | 'architecture'
  | 'comparison_matrix'
  | 'timeline'
  | 'dependency_graph';

export type EdgeType =
  | 'contains'
  | 'requires'
  | 'uses'
  | 'implements'
  | 'contrasts'
  | 'leads_to'
  | 'example_of';

export type NodeImportance = 'critical' | 'important' | 'supplementary';
export type MasteryStatus = 'unknown' | 'learning' | 'understood' | 'mastered';
export type MapViewMode = 'tree' | 'flow' | 'timeline' | 'compare';

export interface KnowledgeNode {
  id: string;
  label: string;
  description: string;
  level: 0 | 1 | 2 | 3;
  sourceRef?: string;
  importance: NodeImportance;
  masteryStatus?: MasteryStatus;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  type: EdgeType;
  label?: string;
}

export interface KnowledgeGraph {
  diagramType: DiagramType;
  topic: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  learningPath: string[];
  generatedAt: number;
  sourceModuleId?: string;
}
