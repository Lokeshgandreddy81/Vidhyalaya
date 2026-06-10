import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  LearningPath,
  Resource,
  UserProfile,
  Achievement,
  GeometryAnchor,
  ContentCitation,
  KnowledgeGraph,
  MasteryStatus,
  SandboxState,
  SkillProfile,
  LearningMemoryState,
  LearningEvidenceRecord,
  ReflectionPrompt,
  ScheduledSession,
  ActiveMissionState,
  ActiveScenarioState,
  LLMConfig
} from '../types';
import { api } from '../services/api';
import { toast } from 'sonner';
import { calculateSkillMastery, MISSION_CATALOG, updateConceptStrength } from '../utils/cortexCoachEngine';
import { initializeSandboxKey } from '../services/geminiService';

interface AppState {
  paths: LearningPath[];
  userProfile: UserProfile;
  achievements: Achievement[];
  geometryAnchors: GeometryAnchor[];
  activePathId: string | null;
  isCloudSynced: boolean;
  addPath: (path: LearningPath) => void;
  setActivePath: (id: string) => void;
  updatePathCalibration: (pathId: string, calibration: { studyLens?: string; scholarPersona?: string; cognitiveDensity?: string }) => void;
  updateModuleStatus: (pathId: string, phaseId: string, moduleId: string, isCompleted: boolean) => void;
  saveModuleNotes: (pathId: string, phaseId: string, moduleId: string, notes: string) => void;
  saveModuleContent: (pathId: string, phaseId: string, moduleId: string, content: string) => void;
  saveModuleCitations: (pathId: string, phaseId: string, moduleId: string, citations: ContentCitation[]) => void;
  addModuleResource: (pathId: string, phaseId: string, moduleId: string, resource: Resource) => void;
  replaceModuleResources: (pathId: string, phaseId: string, moduleId: string, resources: Resource[]) => void;
  saveModuleKnowledgeGraph: (pathId: string, phaseId: string, moduleId: string, graph: KnowledgeGraph) => void;
  saveNodeMastery: (pathId: string, phaseId: string, moduleId: string, nodeId: string, status: MasteryStatus) => void;
  saveModuleSandboxState: (pathId: string, phaseId: string, moduleId: string, sandboxState: SandboxState) => void;
  anchorGeometry: (anchor: GeometryAnchor) => void;
  clearGeometryAnchors: (moduleTitle?: string) => void;
  refreshPaths: () => Promise<void>;
  loadPathDetail: (pathId: string) => Promise<void>;
  deletePath: (id: string) => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  updateSessionStatus: (pathId: string, sessionId: string, isCompleted: boolean) => void;
  updateSessionDateTime: (pathId: string, sessionId: string, startTime: string, endTime: string) => void;
  deleteSession: (pathId: string, sessionId: string) => void;
  addCustomSession: (pathId: string, title: string, startTime: string, endTime: string, moduleId?: string) => void;
  clearAllSessions: () => void;
  isAuthenticated: boolean;
  setAuthenticated: (auth: boolean) => void;
  resetData: () => void;

  // Cortex Coach Additions
  skills: SkillProfile;
  memory: LearningMemoryState;
  activeMission: ActiveMissionState | null;
  activeScenario: ActiveScenarioState | null;
  logCommandExecution: (cmd: string, success: boolean, conceptId?: string) => void;
  logMistake: (category: string, mistakeId: string) => void;
  logLearningEvidence: (evidence: LearningEvidenceRecord) => void;
  saveReflectionPrompt: (promptId: string) => void;
  dismissReflectionPrompt: (promptId: string) => void;
  startMission: (missionId: string) => void;
  updateMissionStep: (stepIndex: number) => void;
  completeActiveMission: () => void;
  startScenario: (scenarioId: string, backupVFS: string, backupGit: string) => void;
  updateScenarioStep: (stepIndex: number) => void;
  exitScenario: () => void;
  byokConfig: LLMConfig | null;
  updateByokConfig: (config: LLMConfig | null) => void;
  byokMode: 'auto' | 'custom';
  updateByokMode: (mode: 'auto' | 'custom') => void;
  isFirstLogin: boolean;
  setIsFirstLogin: (val: boolean) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const INITIAL_PROFILE: UserProfile = {
  userId: 'default-user',
  name: 'Scholar',
  email: '',
  role: 'Architect',
  xp: 0,
  level: 1,
  streakDays: 1,
  joinedAt: new Date().toISOString(),
  preferences: {
    aiModel: 'gemini-2.5-flash',
    theme: 'light',
    focusMode: false
  }
};

const INITIAL_SKILLS: SkillProfile = {
  git: {
    id: 'git',
    name: 'Git Version Control',
    overallScore: 0,
    subSkills: {
      branching: { id: 'branching', name: 'Branching', score: 0, attempts: 0, successes: 0 },
      staging: { id: 'staging', name: 'Staging', score: 0, attempts: 0, successes: 0 },
      conflicts: { id: 'conflicts', name: 'Conflict Resolution', score: 0, attempts: 0, successes: 0 },
    },
    lastActive: new Date().toISOString(),
    mistakeCounts: {},
  },
  linux: {
    id: 'linux',
    name: 'Linux Commands & CLI',
    overallScore: 0,
    subSkills: {
      navigation: { id: 'navigation', name: 'File Navigation', score: 0, attempts: 0, successes: 0 },
      permissions: { id: 'permissions', name: 'File Permissions', score: 0, attempts: 0, successes: 0 },
    },
    lastActive: new Date().toISOString(),
    mistakeCounts: {},
  },
};

const INITIAL_MEMORY: LearningMemoryState = {
  userId: 'default-user',
  concepts: {
    git_staging: { conceptId: 'git_staging', strength: 24, lastSuccessfulExec: new Date().toISOString(), consecutiveSuccesses: 0, failureCount: 0, reviewsTriggered: 0 },
    cli_redirection: { conceptId: 'cli_redirection', strength: 24, lastSuccessfulExec: new Date().toISOString(), consecutiveSuccesses: 0, failureCount: 0, reviewsTriggered: 0 },
  },
  commonMistakesLog: [],
  evidenceLog: [],
  reflectionQueue: [],
};

const normalizeMemoryState = (raw?: Partial<LearningMemoryState> | null): LearningMemoryState => ({
  userId: raw?.userId || INITIAL_MEMORY.userId,
  concepts: raw?.concepts || INITIAL_MEMORY.concepts,
  commonMistakesLog: raw?.commonMistakesLog || [],
  evidenceLog: raw?.evidenceLog || [],
  reflectionQueue: raw?.reflectionQueue || [],
});

const parseCachedJson = <T,>(key: string, fallback: T, normalizer?: (value: unknown) => T): T => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return fallback;
    const parsed = JSON.parse(cached);
    return normalizer ? normalizer(parsed) : parsed;
  } catch {
    return fallback;
  }
};

const evidenceLimit = 80;

const formatConceptLabel = (conceptId: string) => conceptId.replace(/[_-]+/g, ' ');

const inferSkillIdsFromText = (text: string, conceptIds: string[] = []) => {
  const corpus = `${text} ${conceptIds.join(' ')}`.toLowerCase();
  const skillIds = new Set<string>();

  if (/(git|branch|commit|merge|repo|staging|version)/.test(corpus)) skillIds.add('git');
  if (/(terminal|linux|cli|shell|command|directory|file)/.test(corpus)) skillIds.add('linux');
  if (/(javascript|typescript|react|state|component|frontend|ui)/.test(corpus)) skillIds.add('javascript');
  if (/(python|data|script|notebook)/.test(corpus)) skillIds.add('python');
  if (/(ai|llm|gemini|prompt|agent|model)/.test(corpus)) skillIds.add('ai');
  if (/(debug|bug|error|failure|repair|fix)/.test(corpus)) skillIds.add('debugging');

  return Array.from(skillIds);
};

const upsertLearningEvidence = (
  memory: LearningMemoryState,
  evidence: LearningEvidenceRecord,
  reflection?: ReflectionPrompt
): LearningMemoryState => {
  const existingPrompt = reflection
    ? memory.reflectionQueue.find(item => item.id === reflection.id)
    : null;
  const nextReflectionQueue = reflection
    ? [
        existingPrompt && existingPrompt.status !== 'open' ? existingPrompt : reflection,
        ...memory.reflectionQueue.filter(item => item.id !== reflection.id)
      ]
    : memory.reflectionQueue;

  return {
    ...memory,
    evidenceLog: [
      evidence,
      ...memory.evidenceLog.filter(item => item.id !== evidence.id)
    ].slice(0, evidenceLimit),
    reflectionQueue: nextReflectionQueue.slice(0, evidenceLimit),
  };
};

const removeModuleEvidence = (
  memory: LearningMemoryState,
  pathId: string,
  phaseId: string,
  moduleId: string
): LearningMemoryState => {
  const evidenceId = `module_completion:${pathId}:${phaseId}:${moduleId}`;
  const reflectionId = `reflection:${pathId}:${phaseId}:${moduleId}`;
  return {
    ...memory,
    evidenceLog: memory.evidenceLog.filter(item => item.id !== evidenceId),
    reflectionQueue: memory.reflectionQueue.filter(item => item.id !== reflectionId),
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [geometryAnchors, setGeometryAnchors] = useState<GeometryAnchor[]>([]);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Cortex Coach States
  const [skills, setSkills] = useState<SkillProfile>(INITIAL_SKILLS);
  const [memory, setMemory] = useState<LearningMemoryState>(INITIAL_MEMORY);
  const [activeMission, setActiveMission] = useState<ActiveMissionState | null>(null);
  const [activeScenario, setActiveScenario] = useState<ActiveScenarioState | null>(null);

  const [isAuthenticated, setAuthenticatedState] = useState<boolean>(() => {
    return localStorage.getItem('vidyal_isAuthenticated') === 'true';
  });

  const [byokConfig, setByokConfig] = useState<LLMConfig | null>(null);
  const [byokMode, setByokModeState] = useState<'auto' | 'custom'>('auto');

  // Automatically mirror BYOK configurations to localStorage
  useEffect(() => {
    if (byokConfig) {
      localStorage.setItem('vidyal_byok_config', JSON.stringify(byokConfig));
      localStorage.setItem(`vidyal_byok_key_${byokConfig.provider}`, byokConfig.apiKey);
      if (byokConfig.preferredModel) {
        localStorage.setItem(`vidyal_byok_model_${byokConfig.provider}`, byokConfig.preferredModel);
      } else {
        localStorage.removeItem(`vidyal_byok_model_${byokConfig.provider}`);
      }
      if (byokConfig.customEndpoint) {
        localStorage.setItem(`vidyal_byok_endpoint_${byokConfig.provider}`, byokConfig.customEndpoint);
      } else {
        localStorage.removeItem(`vidyal_byok_endpoint_${byokConfig.provider}`);
      }
    } else {
      localStorage.removeItem('vidyal_byok_config');
    }
  }, [byokConfig]);

  useEffect(() => {
    if (byokMode) {
      localStorage.setItem('vidyal_byok_mode', byokMode);
    }
  }, [byokMode]);

  const updateByokConfig = (config: LLMConfig | null) => {
    setByokConfig(config);
  };

  const updateByokMode = (mode: 'auto' | 'custom') => {
    setByokModeState(mode);
  };

  const [isFirstLogin, setIsFirstLoginState] = useState<boolean>(true);
  const setIsFirstLogin = (val: boolean) => {
    setIsFirstLoginState(val);
  };

  const setAuthenticated = (auth: boolean) => {
    localStorage.setItem('vidyal_isAuthenticated', auth ? 'true' : 'false');
    setAuthenticatedState(auth);
  };

  const syncPathWithCloud = (pathId: string, updatedPath: LearningPath, onDone?: () => void) => {
    setIsCloudSynced(false);
    api.updatePath(pathId, updatedPath)
      .then(() => {
        setIsCloudSynced(true);
        if (onDone) onDone();
      })
      .catch((err: any) => {
        console.error('❌ [STORE] Cloud sync failed:', err);
        setIsCloudSynced(true);
        const isAuthError = err?.status === 401 || 
                            (err?.message && (err.message.includes('expired') || err.message.includes('Unauthorized') || err.message.includes('token') || err.message.includes('login')));
        if (isAuthError) {
          setAuthenticated(false);
          toast.error('Session expired. Please log in again to save your progress.', {
            id: 'auth-error-sync',
            duration: 5000,
          });
        } else {
          toast.error('Failed to sync changes with the cloud.', {
            id: 'cloud-sync-error',
          });
        }
      });
  };

  // Debounced cloud sync of user learning state
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      api.saveUserState({
        skills,
        memory,
        activeMission,
        activeScenario,
        byokConfig,
        byokMode,
        isFirstLogin
      }).catch(err => console.warn('Failed to sync learning state to cloud:', err));
    }, 1000);

    return () => clearTimeout(timer);
  }, [skills, memory, activeMission, activeScenario, byokConfig, byokMode, isFirstLogin, isAuthenticated]);

  useEffect(() => {
    import('../services/geminiService').then(({ refreshServerAiStatus }) => {
      void refreshServerAiStatus();
    });
  }, []);

  const logCommandExecution = (cmd: string, success: boolean, conceptId?: string) => {
    const normalized = cmd.trim().toLowerCase();

    // Determine category and subskill
    let categoryKey: 'git' | 'linux' | null = null;
    let subSkillKey: string | null = null;

    if (normalized.startsWith('git ')) {
      categoryKey = 'git';
      if (normalized.startsWith('git branch') || normalized.startsWith('git checkout -b') || normalized.startsWith('git switch')) {
        subSkillKey = 'branching';
      } else if (normalized.startsWith('git add') || normalized.startsWith('git rm --cached')) {
        subSkillKey = 'staging';
      } else if (normalized.startsWith('git merge') || normalized.startsWith('git commit')) {
        subSkillKey = 'conflicts';
      }
    } else {
      // standard CLI
      const baseCmd = normalized.split(/\s+/)[0];
      const isCli = ['ls', 'cd', 'pwd', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'cat', 'find', 'grep'].includes(baseCmd);
      if (isCli) {
        categoryKey = 'linux';
        if (baseCmd === 'chmod') {
          subSkillKey = 'permissions';
        } else {
          subSkillKey = 'navigation';
        }
      }
    }

    if (categoryKey && subSkillKey) {
      setSkills(prev => {
        const cat = { ...prev[categoryKey!] };
        const sub = { ...cat.subSkills[subSkillKey!] };

        sub.attempts += 1;
        if (success) sub.successes += 1;

        cat.subSkills[subSkillKey!] = sub;
        cat.lastActive = new Date().toISOString();
        cat.overallScore = calculateSkillMastery(cat);

        return {
          ...prev,
          [categoryKey!]: cat
        };
      });
    }

    // If a concept ID was provided, update its strength
    if (conceptId) {
      setMemory(prev => {
        const normalizedMemory = normalizeMemoryState(prev);
        const concept = normalizedMemory.concepts[conceptId!];
        if (!concept) return normalizedMemory;
        const updated = updateConceptStrength(concept, success);
        return {
          ...normalizedMemory,
          concepts: {
            ...normalizedMemory.concepts,
            [conceptId!]: updated
          }
        };
      });
    }
  };

  const logMistake = (category: string, mistakeId: string) => {
    if (skills[category]) {
      setSkills(prev => {
        const cat = { ...prev[category] };
        const counts = { ...cat.mistakeCounts };
        counts[mistakeId] = (counts[mistakeId] || 0) + 1;
        cat.mistakeCounts = counts;
        cat.overallScore = calculateSkillMastery(cat);
        return { ...prev, [category]: cat };
      });
    }

    setMemory(prev => {
      const normalizedMemory = normalizeMemoryState(prev);
      const logs = [...normalizedMemory.commonMistakesLog];
      logs.push({
        mistakeId,
        timestamp: new Date().toISOString(),
        contextCommand: '',
        resolved: false
      });
      return { ...normalizedMemory, commonMistakesLog: logs };
    });
  };

  const logLearningEvidence = (evidence: LearningEvidenceRecord) => {
    setMemory(prev => upsertLearningEvidence(normalizeMemoryState(prev), evidence));
  };

  const saveReflectionPrompt = (promptId: string) => {
    setMemory(prev => {
      const normalizedMemory = normalizeMemoryState(prev);
      return {
        ...normalizedMemory,
        reflectionQueue: normalizedMemory.reflectionQueue.map(prompt => (
          prompt.id === promptId
            ? { ...prompt, status: 'saved', resolvedAt: new Date().toISOString() }
            : prompt
        ))
      };
    });
  };

  const dismissReflectionPrompt = (promptId: string) => {
    setMemory(prev => {
      const normalizedMemory = normalizeMemoryState(prev);
      return {
        ...normalizedMemory,
        reflectionQueue: normalizedMemory.reflectionQueue.map(prompt => (
          prompt.id === promptId
            ? { ...prompt, status: 'dismissed', resolvedAt: new Date().toISOString() }
            : prompt
        ))
      };
    });
  };

  const startMission = (missionId: string) => {
    setActiveScenario(null);
    setActiveMission({
      missionId,
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      completedSteps: []
    });
  };

  const updateMissionStep = (stepIndex: number) => {
    setActiveMission(prev => {
      if (!prev) return null;
      const completed = [...prev.completedSteps];
      if (!completed.includes(prev.currentStepIndex)) {
        completed.push(prev.currentStepIndex);
      }
      return {
        ...prev,
        currentStepIndex: stepIndex,
        completedSteps: completed
      };
    });
  };

  const completeActiveMission = () => {
    if (activeMission) {
      const mission = MISSION_CATALOG[activeMission.missionId];
      if (mission) {
        const now = new Date().toISOString();
        const conceptIds = mission.steps
          .map(step => step.validationParam || step.validationType)
          .filter(Boolean)
          .map(formatConceptLabel);
        const evidenceId = `mission_completion:${mission.id}`;
        const evidence: LearningEvidenceRecord = {
          id: evidenceId,
          type: 'mission_completion',
          title: `Mission Evidence: ${mission.title}`,
          summary: `Completed ${mission.steps.length} mission checks in ${mission.track}.`,
          conceptIds,
          skillIds: inferSkillIdsFromText(`${mission.title} ${mission.track}`, conceptIds),
          helpLevel: 'unknown',
          capturedAt: now,
        };
        const reflection: ReflectionPrompt = {
          id: `reflection:mission:${mission.id}`,
          title: `Reflect on ${mission.title}`,
          prompt: 'What did you prove, where did you need help, and how would you recognize this pattern in a real project?',
          status: 'open',
          evidenceId,
          createdAt: now,
        };
        setMemory(prev => upsertLearningEvidence(normalizeMemoryState(prev), evidence, reflection));
      }
    }
    setActiveMission(null);
  };

  const startScenario = (scenarioId: string, backupVFS: string, backupGit: string) => {
    setActiveMission(null);
    setActiveScenario({
      scenarioId,
      currentStepIndex: 0,
      backupVFS,
      backupGit
    });
  };

  const updateScenarioStep = (stepIndex: number) => {
    setActiveScenario(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentStepIndex: stepIndex
      };
    });
  };

  const exitScenario = () => {
    setActiveScenario(null);
  };



  useEffect(() => {
    // Hard failsafe: if the fetch hangs for any reason, unblock the app after 5s
    const failsafeTimer = setTimeout(() => {
      setIsCloudSynced(true);
    }, 5000);

    const fetchInitialData = async () => {
      try {
        await initializeSandboxKey();
        const [profile, userPaths, userState] = await Promise.all([
          api.getUserProfile(),
          api.getUserPaths(),
          api.getUserState()
        ]);

        if (profile) {
          setUserProfile(profile as UserProfile);
          if (profile.preferences) {
            localStorage.setItem('vidyal_user_preferences', JSON.stringify(profile.preferences));
          }
        }
        if (userPaths) setPaths(userPaths);

        if (userState) {
          if (userState.skills && Object.keys(userState.skills).length > 0) setSkills(userState.skills);
          if (userState.memory && Object.keys(userState.memory).length > 0) setMemory(normalizeMemoryState(userState.memory));
          if (userState.activeMission) setActiveMission(userState.activeMission);
          if (userState.activeScenario) setActiveScenario(userState.activeScenario);
          if (userState.byokConfig) setByokConfig(userState.byokConfig);
          if (userState.byokMode) setByokModeState(userState.byokMode);
          if (userState.isFirstLogin !== undefined) setIsFirstLoginState(userState.isFirstLogin);
        } else {
          // Migration from localStorage
          const localSkills = parseCachedJson('cortex-skills', null);
          const localMemory = parseCachedJson('cortex-memory', null);
          const localMission = parseCachedJson('cortex-active-mission', null);
          const localScenario = parseCachedJson('cortex-active-scenario', null);
          const localByok = parseCachedJson('vidyal_byok_config', null);
          const localByokMode = localStorage.getItem('vidyal_byok_mode') as 'auto' | 'custom' | null;
          const localFirstLogin = localStorage.getItem('vidyal_is_first_login');

          if (localSkills || localMemory || localMission || localScenario || localByok) {
            console.log('[Store] Migrating local state to cloud database...');
            const migratedSkills = localSkills || INITIAL_SKILLS;
            const migratedMemory = localMemory ? normalizeMemoryState(localMemory) : INITIAL_MEMORY;
            const migratedByokMode = localByokMode || 'auto';
            const migratedFirstLogin = localFirstLogin !== 'false';

            setSkills(migratedSkills);
            setMemory(migratedMemory);
            if (localMission) setActiveMission(localMission);
            if (localScenario) setActiveScenario(localScenario);
            if (localByok) setByokConfig(localByok);
            setByokModeState(migratedByokMode);
            setIsFirstLoginState(migratedFirstLogin);

            void api.saveUserState({
              skills: migratedSkills,
              memory: migratedMemory,
              activeMission: localMission,
              activeScenario: localScenario,
              byokConfig: localByok,
              byokMode: migratedByokMode,
              isFirstLogin: migratedFirstLogin
            }).then(() => {
              // Clean local storage after successful migration
              localStorage.removeItem('cortex-skills');
              localStorage.removeItem('cortex-memory');
              localStorage.removeItem('cortex-active-mission');
              localStorage.removeItem('cortex-active-scenario');
              localStorage.removeItem('vidyal_byok_config');
              localStorage.removeItem('vidyal_byok_mode');
              localStorage.removeItem('vidyal_is_first_login');
            });
          }
        }
      } catch (e: any) {
        console.error('Failed to fetch data from backend:', e);
        const errorMessage = e?.message || '';
        const isAuthError = errorMessage.includes('Unauthorized') || 
                            errorMessage.includes('expired') || 
                            errorMessage.includes('token') || 
                            errorMessage.includes('login') ||
                            errorMessage.includes('401') ||
                            errorMessage.includes('403');
        if (isAuthError && isAuthenticated) {
          console.warn('[STORE] Auth validation failed on initialization. Logging out.');
          localStorage.removeItem('vidyal_isAuthenticated');
          localStorage.removeItem('vidyal_user_token');
          localStorage.removeItem('vidyal_user_id');
          setAuthenticatedState(false);
          toast.error('Your session has expired. Please log in again.', {
            id: 'auth-init-error',
            duration: 5000,
          });
        }
      } finally {
        // Always mark as synced so we never get stuck on infinite spinner
        clearTimeout(failsafeTimer);
        setIsCloudSynced(true);
      }
    };
    fetchInitialData();

    return () => clearTimeout(failsafeTimer);
  }, [isAuthenticated]);

  const generateScheduledSessions = (path: LearningPath): ScheduledSession[] => {
    const sessions: ScheduledSession[] = [];
    const dailyCommitment = path.dailyCommitmentMinutes || 45;
    const preferredStartTime = path.preferredStartTime || "09:00";

    const [hourStr, minStr] = preferredStartTime.split(':');
    const prefHour = parseInt(hourStr, 10) || 9;
    const prefMin = parseInt(minStr, 10) || 0;

    let currentDayOffset = 0;

    (path.phases || []).forEach((phase) => {
      phase.modules.forEach((mod) => {
        const estimatedMinutes = mod.estimatedMinutes || dailyCommitment;
        const numSessions = Math.max(1, Math.ceil(estimatedMinutes / dailyCommitment));

        for (let i = 0; i < numSessions; i++) {
          const sessionDate = new Date();
          sessionDate.setDate(sessionDate.getDate() + currentDayOffset);
          sessionDate.setHours(prefHour, prefMin, 0, 0);

          const startTime = sessionDate.toISOString();

          const endSessionDate = new Date(sessionDate);
          endSessionDate.setMinutes(endSessionDate.getMinutes() + dailyCommitment);
          const endTime = endSessionDate.toISOString();

          sessions.push({
            id: Math.random().toString(36).substr(2, 9),
            pathId: path.id,
            moduleId: mod.id,
            title: numSessions > 1 ? `${mod.title} (Part ${i + 1}/${numSessions})` : mod.title,
            startTime,
            endTime,
            isCompleted: false
          });

          currentDayOffset += 1;
        }
      });
    });

    return sessions;
  };

  const addPath = (path: LearningPath) => {
    const pathWithSessions = { ...path };
    if (!pathWithSessions.sessions || pathWithSessions.sessions.length === 0) {
      pathWithSessions.sessions = generateScheduledSessions(pathWithSessions);
    }
    setPaths(prev => [pathWithSessions, ...prev]);
    api.createPath(pathWithSessions).catch(console.error);
  };

  const refreshPaths = async () => {
    try {
      console.log('🔄 [STORE] Refreshing paths from backend...');
      const freshPaths = await api.getUserPaths();
      console.log('✅ [STORE] Paths refreshed, got', freshPaths.length, 'paths');
      setPaths(freshPaths);
    } catch (err) {
      console.error('❌ [STORE] Failed to refresh paths:', err);
    }
  };

  const loadPathDetail = async (pathId: string) => {
    try {
      const fullPath = await api.getPath(pathId);
      if (fullPath) {
        setPaths(prev => {
          const exists = prev.some(p => p.id === pathId);
          if (exists) {
            return prev.map(p => p.id === pathId ? { ...p, ...fullPath } : p);
          } else {
            return [...prev, fullPath];
          }
        });
      }
    } catch (err) {
      console.warn('Failed to load path details from server:', err);
    }
  };

  const updateModuleStatus = (pathId: string, phaseId: string, moduleId: string, isCompleted: boolean) => {
    const targetPath = paths.find(path => path.id === pathId);
    const targetPhase = targetPath?.phases.find(phase => phase.id === phaseId);
    const targetModule = targetPhase?.modules.find(mod => mod.id === moduleId);

    if (targetPath && targetPhase && targetModule) {
      if (isCompleted) {
        const now = new Date().toISOString();
        const conceptIds = targetModule.keyConcepts || [];
        const evidenceId = `module_completion:${pathId}:${phaseId}:${moduleId}`;
        const evidence: LearningEvidenceRecord = {
          id: evidenceId,
          type: 'module_completion',
          title: `Module Evidence: ${targetModule.title}`,
          summary: `Completed "${targetModule.title}" in ${targetPath.title}. Transfer evidence is still pending.`,
          pathId,
          phaseId,
          moduleId,
          conceptIds,
          skillIds: inferSkillIdsFromText(`${targetPath.title} ${targetPath.goal} ${targetModule.title}`, conceptIds),
          helpLevel: 'unknown',
          capturedAt: now,
        };
        const reflection: ReflectionPrompt = {
          id: `reflection:${pathId}:${phaseId}:${moduleId}`,
          title: `Reflect on ${targetModule.title}`,
          prompt: 'What did you learn, what still feels weak, and where could this concept fail in a real project?',
          status: 'open',
          pathId,
          phaseId,
          moduleId,
          evidenceId,
          createdAt: now,
        };
        setMemory(prev => upsertLearningEvidence(normalizeMemoryState(prev), evidence, reflection));
      } else {
        setMemory(prev => removeModuleEvidence(normalizeMemoryState(prev), pathId, phaseId, moduleId));
      }
    }

    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const newPhases = (path.phases || []).map(phase => {
        if (phase.id !== phaseId) return phase;
        return {
          ...phase,
          modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, isCompleted } : mod)
        };
      });
      const total = newPhases.reduce((acc, p) => acc + p.modules.length, 0);
      const done = newPhases.reduce((acc, p) => acc + p.modules.filter(m => m.isCompleted).length, 0);
      const updatedPath = { 
        ...path, 
        phases: newPhases, 
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
        sessions: path.sessions?.map(s => s.moduleId === moduleId ? { ...s, isCompleted } : s)
      };

      // Update backend optimistically
      syncPathWithCloud(pathId, updatedPath);

      return updatedPath;
    }));
  };
  
  const updatePathCalibration = (
    pathId: string,
    calibration: { studyLens?: string; scholarPersona?: string; cognitiveDensity?: string }
  ) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        studyLens: calibration.studyLens !== undefined ? calibration.studyLens : path.studyLens,
        scholarPersona: calibration.scholarPersona !== undefined ? calibration.scholarPersona : path.scholarPersona,
        cognitiveDensity: calibration.cognitiveDensity !== undefined ? calibration.cognitiveDensity : path.cognitiveDensity,
        phases: (path.phases || []).map(phase => ({
          ...phase,
          modules: phase.modules.map(mod => {
            if (mod.isCompleted) return mod;
            return {
              ...mod,
              generatedContent: undefined,
              knowledgeGraph: undefined,
              citations: undefined
            };
          })
        }))
      };
      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const saveModuleNotes = (pathId: string, phaseId: string, moduleId: string, notes: string) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        phases: (path.phases || []).map(phase => phase.id !== phaseId ? phase : {
          ...phase,
          modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, userNotes: notes } : mod)
        })
      };
      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const saveModuleContent = (pathId: string, phaseId: string, moduleId: string, content: string) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        phases: (path.phases || []).map(phase => phase.id !== phaseId ? phase : {
          ...phase,
          modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, generatedContent: content } : mod)
        })
      };
      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const saveModuleCitations = (pathId: string, phaseId: string, moduleId: string, citations: ContentCitation[]) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        phases: (path.phases || []).map(phase => phase.id !== phaseId ? phase : {
          ...phase,
          modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, citations } : mod)
        })
      };
      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const addModuleResource = (pathId: string, phaseId: string, moduleId: string, resource: Resource) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        phases: (path.phases || []).map(phase => phase.id !== phaseId ? phase : {
          ...phase,
          modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, resources: [...(mod.resources || []), resource] } : mod)
        })
      };
      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const replaceModuleResources = (pathId: string, phaseId: string, moduleId: string, resources: Resource[]) => {
    console.log('🔄 [STORE] replaceModuleResources called for module:', moduleId);
    console.log('🔄 [STORE] Resources to save:', resources.map(r => ({ type: r.type, videoId: r.videoId, title: r.title?.substring(0, 30) })));

    setPaths(prev => {
      const newPath = prev.map(path => {
        if (path.id !== pathId) return path;
        const updatedPath = {
          ...path,
          phases: (path.phases || []).map(phase => phase.id !== phaseId ? phase : {
            ...phase,
            modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, resources } : mod)
          })
        };
        console.log('🔄 [STORE] Sending update to backend...');
        syncPathWithCloud(pathId, updatedPath, () => console.log('✅ [STORE] Backend update successful'));
        return updatedPath;
      });
      console.log('🔄 [STORE] State updated, new first video:', newPath.find(p => p.id === pathId)?.phases?.find(ph => ph.id === phaseId)?.modules.find(m => m.id === moduleId)?.resources.find(r => r.type === 'youtube')?.videoId);
      return newPath;
    });
  };

  const saveModuleKnowledgeGraph = (pathId: string, phaseId: string, moduleId: string, graph: KnowledgeGraph) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        phases: (path.phases || []).map(phase => phase.id !== phaseId ? phase : {
          ...phase,
          modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, knowledgeGraph: graph } : mod),
        }),
      };
      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const saveNodeMastery = (pathId: string, phaseId: string, moduleId: string, nodeId: string, status: MasteryStatus) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        phases: (path.phases || []).map(phase => phase.id !== phaseId ? phase : {
          ...phase,
          modules: phase.modules.map(mod => {
            if (mod.id !== moduleId) return mod;
            return { ...mod, nodeMastery: { ...(mod.nodeMastery || {}), [nodeId]: status } };
          }),
        }),
      };
      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const saveModuleSandboxState = (pathId: string, phaseId: string, moduleId: string, sandboxState: SandboxState) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        phases: (path.phases || []).map(phase => phase.id !== phaseId ? phase : {
          ...phase,
          modules: phase.modules.map(mod =>
            mod.id === moduleId ? { ...mod, sandboxState } : mod
          ),
        }),
      };
      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const anchorGeometry = (anchor: GeometryAnchor) => {
    setGeometryAnchors(prev => {
      const anchorKey = `${anchor.moduleTitle}::${anchor.kind}::${anchor.label}`.toLowerCase();
      const withoutDuplicate = prev.filter(item => `${item.moduleTitle}::${item.kind}::${item.label}`.toLowerCase() !== anchorKey);
      return [anchor, ...withoutDuplicate].slice(0, 32);
    });
  };

  const clearGeometryAnchors = (moduleTitle?: string) => {
    setGeometryAnchors(prev => moduleTitle ? prev.filter(anchor => anchor.moduleTitle !== moduleTitle) : []);
  };

  const deletePath = (id: string) => {
    setPaths(prev => prev.filter(p => p.id !== id));
    api.deletePath(id).catch(console.error);
  };

  const updateUserProfile = (data: Partial<UserProfile>) => {
    setUserProfile(prev => {
      const updatedProfile = { ...prev, ...data };
      api.updateUserProfile(updatedProfile).catch(console.error);
      if (updatedProfile.preferences) {
        localStorage.setItem('vidyal_user_preferences', JSON.stringify(updatedProfile.preferences));
      }
      return updatedProfile;
    });
  };

  const updateSessionStatus = (pathId: string, sessionId: string, isCompleted: boolean) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;

      const targetSession = path.sessions?.find(s => s.id === sessionId);
      if (!targetSession) return path;

      const updatedSessions = path.sessions?.map(s => s.id === sessionId ? { ...s, isCompleted } : s) || [];

      let newPhases = path.phases || [];
      const moduleId = targetSession.moduleId;

      if (moduleId) {
        // Find if all sessions for this moduleId are now completed
        const moduleSessions = updatedSessions.filter(s => s.moduleId === moduleId);
        const allCompleted = moduleSessions.length > 0 && moduleSessions.every(s => s.isCompleted);

        // Find phase containing this module
        let phaseId = '';
        for (const phase of (path.phases || [])) {
          if (phase.modules.some(m => m.id === moduleId)) {
            phaseId = phase.id;
            break;
          }
        }

        if (phaseId) {
          const targetPhase = (path.phases || []).find(p => p.id === phaseId);
          const targetModule = targetPhase?.modules.find(m => m.id === moduleId);

          if (targetModule && targetModule.isCompleted !== allCompleted) {
            // Trigger evidence and reflection updates
            if (allCompleted) {
              const now = new Date().toISOString();
              const conceptIds = targetModule.keyConcepts || [];
              const evidenceId = `module_completion:${pathId}:${phaseId}:${moduleId}`;
              const evidence: LearningEvidenceRecord = {
                id: evidenceId,
                type: 'module_completion',
                title: `Module Evidence: ${targetModule.title}`,
                summary: `Completed "${targetModule.title}" in ${path.title}. Transfer evidence is still pending.`,
                pathId,
                phaseId,
                moduleId,
                conceptIds,
                skillIds: inferSkillIdsFromText(`${path.title} ${path.goal} ${targetModule.title}`, conceptIds),
                helpLevel: 'unknown',
                capturedAt: now,
              };
              const reflection: ReflectionPrompt = {
                id: `reflection:${pathId}:${phaseId}:${moduleId}`,
                title: `Reflect on ${targetModule.title}`,
                prompt: 'What did you learn, what still feels weak, and where could this concept fail in a real project?',
                status: 'open',
                pathId,
                phaseId,
                moduleId,
                evidenceId,
                createdAt: now,
              };
              setMemory(prevMemory => upsertLearningEvidence(normalizeMemoryState(prevMemory), evidence, reflection));
            } else {
              setMemory(prevMemory => removeModuleEvidence(normalizeMemoryState(prevMemory), pathId, phaseId, moduleId));
            }

            // Update the module status inside the phases
            newPhases = (path.phases || []).map(phase => {
              if (phase.id !== phaseId) return phase;
              return {
                ...phase,
                modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, isCompleted: allCompleted } : mod)
              };
            });
          }
        }
      }

      const total = newPhases.reduce((acc, p) => acc + p.modules.length, 0);
      const done = newPhases.reduce((acc, p) => acc + p.modules.filter(m => m.isCompleted).length, 0);
      
      const updatedPath = {
        ...path,
        sessions: updatedSessions,
        phases: newPhases,
        progress: total > 0 ? Math.round((done / total) * 100) : 0
      };

      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const updateSessionDateTime = (pathId: string, sessionId: string, startTime: string, endTime: string) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        sessions: path.sessions?.map(s => s.id === sessionId ? { ...s, startTime, endTime } : s)
      };
      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const deleteSession = (pathId: string, sessionId: string) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        sessions: path.sessions?.filter(s => s.id !== sessionId)
      };
      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const addCustomSession = (pathId: string, title: string, startTime: string, endTime: string, moduleId?: string) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const newSession: ScheduledSession = {
        id: Math.random().toString(36).substring(2, 11),
        pathId,
        moduleId,
        title,
        startTime,
        endTime,
        isCompleted: false
      };
      const updatedPath = {
        ...path,
        sessions: [...(path.sessions || []), newSession]
      };
      syncPathWithCloud(pathId, updatedPath);
      return updatedPath;
    }));
  };

  const clearAllSessions = () => {
    setPaths(prev => {
      const updated = prev.map(path => ({ ...path, sessions: [] }));
      updated.forEach(p => syncPathWithCloud(p.id, p));
      return updated;
    });
  };

  const resetData = () => {
    setPaths([]);
    setUserProfile(INITIAL_PROFILE);
    setSkills(INITIAL_SKILLS);
    setMemory(INITIAL_MEMORY);
    setActiveMission(null);
    setActiveScenario(null);
    setByokConfig(null);
    setByokModeState('auto');
    localStorage.removeItem('vidyal_byok_config');
    localStorage.removeItem('vidyal_byok_mode');
    localStorage.removeItem('vidyal_byok_keys_cache');
    const providers = ['gemini', 'openai', 'anthropic', 'openrouter', 'groq'];
    providers.forEach(p => {
      localStorage.removeItem(`vidyal_byok_key_${p}`);
      localStorage.removeItem(`vidyal_byok_model_${p}`);
      localStorage.removeItem(`vidyal_byok_endpoint_${p}`);
    });
  };

  return (
    <AppContext.Provider value={{
      paths, activePathId, userProfile, achievements, geometryAnchors, isCloudSynced, isAuthenticated, setAuthenticated,
      addPath, setActivePath: setActivePathId, updatePathCalibration, updateModuleStatus, saveModuleNotes, saveModuleContent,
      saveModuleCitations, addModuleResource, replaceModuleResources,
      saveModuleKnowledgeGraph, saveNodeMastery, saveModuleSandboxState,
      anchorGeometry, clearGeometryAnchors, deletePath, updateUserProfile, updateSessionStatus, 
      updateSessionDateTime, deleteSession, addCustomSession,
      clearAllSessions, resetData, refreshPaths, loadPathDetail,
      byokConfig, updateByokConfig, byokMode, updateByokMode,
      isFirstLogin, setIsFirstLogin,
      skills, memory, activeMission, activeScenario, logCommandExecution, logMistake,
      logLearningEvidence, saveReflectionPrompt, dismissReflectionPrompt,
      startMission, updateMissionStep, completeActiveMission, startScenario, updateScenarioStep, exitScenario
    }}>
      {children}
    </AppContext.Provider>
  );

};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};
