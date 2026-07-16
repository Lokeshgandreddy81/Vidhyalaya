
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
  type: 'url' | 'text' | 'pdf' | 'video' | 'youtube' | 'pdf_link' | 'article';
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
  cursorLine?: number;
}

export interface SandboxRunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  errorLine?: number;
  errorMessage?: string;
  runtimeMissing?: boolean;
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
  studyLens?: string;
  scholarPersona?: string;
  cognitiveDensity?: string;
  isFallback?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'assistant';
  text: string;
  parentId?: string | null;
  childrenIds?: string[];
  isPinned?: boolean;
  pinnedAt?: number;
  images?: { data: string; mimeType: string; }[];
  document?: { name: string; type: string; };
  documents?: { name: string; type: string; }[];
  reasoning?: string;
  timestamp: number;
  mode?: 'Teacher' | 'Mentor' | 'Debugger' | 'Coach' | 'Socratic' | 'Interviewer' | 'PairProgrammer' | 'Companion' | 'Assistant';
  intent?: 'Debugging' | 'Conceptual' | 'Frustration' | 'Curiosity' | 'Validation' | 'Unknown';
  action?: 'highlight_code' | 'move_cursor' | 'dim_terminal' | 'none';
  target?: string;
  skill_update?: { concept: string; delta: number } | null;
  interactive_block?: {
    type: 'quick_choices' | 'inline_challenge' | 'guided_experiment';
    data: any;
  } | null;
  parameters?: any;
  isGenerating?: boolean;
  isThinking?: boolean;
  activeAgents?: string[];
  completedAgents?: string[];
  payloadData?: any;
  status?: 'Scouting' | 'Done' | 'Failed';
  sara_metadata?: {
    cognitive_load?: number;
    ui_suggestion?: 'render_persona_pills' | 'render_friction_poll' | 'none';
    micro_challenge?: string;
    recommended_duration?: string;
  } | null;
  thinkingDuration?: number;
  ttft?: number;
  warning?: {
    title: string;
    message: string;
    type: 'network' | 'config' | 'tool';
    code?: string;
  } | null;
  editCount?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  selectedChildMap?: Record<string, string>;
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
    cognitivePace?: 'Balanced' | 'Spaced' | 'Sprint';
    pedagogicalMode?: 'Coach' | 'Socratic' | 'Debugger' | 'Teacher' | 'PairProgrammer';
    analogyDomain?: 'Tech' | 'Daily Life' | 'Sports' | 'Space';
    temperature?: number;
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
export type MapViewMode = 'orbit' | 'tree' | 'flow' | 'timeline' | 'compare';

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

// Cortex AI Coding Coach Engine Interfaces

export interface SubSkill {
  id: string;
  name: string;
  score: number;
  attempts: number;
  successes: number;
}

export interface SkillCategory {
  id: string;
  name: string;
  overallScore: number;
  subSkills: Record<string, SubSkill>;
  lastActive: string;
  mistakeCounts: Record<string, number>;
}

export type SkillProfile = Record<string, SkillCategory>;

export interface ConceptMemory {
  conceptId: string;
  strength: number;
  lastSuccessfulExec: string;
  consecutiveSuccesses: number;
  failureCount: number;
  reviewsTriggered: number;
}

export type LearningEvidenceType =
  | 'module_completion'
  | 'mission_completion'
  | 'scenario_completion'
  | 'terminal_recovery'
  | 'reflection'
  | 'transfer_check';

export interface LearningEvidenceRecord {
  id: string;
  type: LearningEvidenceType;
  title: string;
  summary: string;
  pathId?: string;
  phaseId?: string;
  moduleId?: string;
  conceptIds: string[];
  skillIds: string[];
  helpLevel: 'none' | 'hint' | 'guided' | 'direct' | 'unknown';
  capturedAt: string;
}

export interface ReflectionPrompt {
  id: string;
  title: string;
  prompt: string;
  status: 'open' | 'saved' | 'dismissed';
  pathId?: string;
  phaseId?: string;
  moduleId?: string;
  evidenceId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface LearningMemoryState {
  userId: string;
  concepts: Record<string, ConceptMemory>;
  commonMistakesLog: Array<{
    mistakeId: string;
    timestamp: string;
    contextCommand: string;
    resolved: boolean;
  }>;
  evidenceLog: LearningEvidenceRecord[];
  reflectionQueue: ReflectionPrompt[];
}

export interface MissionStep {
  stepIndex: number;
  instruction: string;
  placeholderText?: string;
  expectedPattern?: string;
  validationType: 'directory_changed' | 'file_exists' | 'file_contains' | 'git_initialized' | 'git_staged' | 'git_committed' | 'command_executed';
  validationParam?: string;
  validationPattern?: string;
  hints: string[];
}

export interface MissionConfig {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  track: string;
  steps: MissionStep[];
}

export interface ActiveMissionState {
  missionId: string;
  currentStepIndex: number;
  startedAt: string;
  completedSteps: number[];
}

export interface ScenarioConfig {
  scenarioId: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  description: string;
  startingDir: string;
  vfsState: Record<string, { type: 'file' | 'dir'; content?: string }>;
  gitState: any; // GitRepo snapshot
  steps: MissionStep[];
}

export interface ActiveScenarioState {
  scenarioId: string;
  currentStepIndex: number;
  backupVFS: string; // Serialized backup VFS
  backupGit: string; // Serialized backup Git
}

export interface TerminalCoachMistakeContext {
  type: 'coach_mistake';
  command: string;
  category: 'git' | 'linux' | 'npm' | 'terminal';
  mistakeTitle: string;
  mistakeLevel: 1 | 2 | 3;
  explanation: string[];
  currentDir: string;
  activeTrackTitle?: string;
  activeTrackKind?: 'mission' | 'scenario';
  currentStepInstruction?: string;
  currentStepHint?: string;
}

export type TerminalSaraContext = string | TerminalCoachMistakeContext;

export interface LLMConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'groq';
  apiKey: string;
  customEndpoint?: string;
  preferredModel?: string;
}

export interface StudentBrainState {
  confidence: number;
  strugglingConcepts: string[];
  lastMistakes: string[];
  hesitationScore: number;
  mentorMemory?: {
    strengths: string[];
    weaknesses: string[];
    commonMistakes: string[];
    learningStyle: string;
  };
}
