import React, { createContext, useContext, useState, useEffect } from 'react';
import { LearningPath, Resource, UserProfile, Achievement, GeometryAnchor, ContentCitation } from '../types';
import { api } from '../services/api';

interface AppState {
  paths: LearningPath[];
  userProfile: UserProfile;
  achievements: Achievement[];
  geometryAnchors: GeometryAnchor[];
  activePathId: string | null;
  isCloudSynced: boolean;
  addPath: (path: LearningPath) => void;
  setActivePath: (id: string) => void;
  updateModuleStatus: (pathId: string, phaseId: string, moduleId: string, isCompleted: boolean) => void;
  saveModuleNotes: (pathId: string, phaseId: string, moduleId: string, notes: string) => void;
  saveModuleContent: (pathId: string, phaseId: string, moduleId: string, content: string) => void;
  saveModuleCitations: (pathId: string, phaseId: string, moduleId: string, citations: ContentCitation[]) => void;
  addModuleResource: (pathId: string, phaseId: string, moduleId: string, resource: Resource) => void;
  replaceModuleResources: (pathId: string, phaseId: string, moduleId: string, resources: Resource[]) => void;
  anchorGeometry: (anchor: GeometryAnchor) => void;
  clearGeometryAnchors: (moduleTitle?: string) => void;
  refreshPaths: () => Promise<void>;
  deletePath: (id: string) => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  updateSessionStatus: (pathId: string, sessionId: string, isCompleted: boolean) => void;
  resetData: () => void;
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
    aiModel: 'gemini-1.5-flash',
    theme: 'light',
    focusMode: false
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [geometryAnchors, setGeometryAnchors] = useState<GeometryAnchor[]>([]);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  useEffect(() => {
    // Hard failsafe: if the fetch hangs for any reason, unblock the app after 5s
    const failsafeTimer = setTimeout(() => {
      setIsCloudSynced(true);
    }, 5000);

    const fetchInitialData = async () => {
      try {
        const [profile, userPaths] = await Promise.all([
          api.getUserProfile(),
          api.getUserPaths()
        ]);
        
        if (profile) setUserProfile(profile as UserProfile);
        if (userPaths) setPaths(userPaths);
      } catch (e) { 
        console.error('Failed to fetch data from backend:', e);
      } finally {
        // Always mark as synced so we never get stuck on infinite spinner
        clearTimeout(failsafeTimer);
        setIsCloudSynced(true);
      }
    };
    fetchInitialData();

    return () => clearTimeout(failsafeTimer);
  }, []);

  const addPath = (path: LearningPath) => {
    setPaths(prev => [path, ...prev]);
    api.createPath(path).catch(console.error);
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

  const updateModuleStatus = (pathId: string, phaseId: string, moduleId: string, isCompleted: boolean) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const newPhases = path.phases.map(phase => {
        if (phase.id !== phaseId) return phase;
        return {
          ...phase,
          modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, isCompleted } : mod)
        };
      });
      const total = newPhases.reduce((acc, p) => acc + p.modules.length, 0);
      const done = newPhases.reduce((acc, p) => acc + p.modules.filter(m => m.isCompleted).length, 0);
      const updatedPath = { ...path, phases: newPhases, progress: Math.round((done / total) * 100) };
      
      // Update backend optimistically
      api.updatePath(pathId, updatedPath).catch(console.error);
      
      return updatedPath;
    }));
  };

  const saveModuleNotes = (pathId: string, phaseId: string, moduleId: string, notes: string) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = { 
        ...path, 
        phases: path.phases.map(phase => phase.id !== phaseId ? phase : { 
          ...phase, 
          modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, userNotes: notes } : mod) 
        }) 
      };
      api.updatePath(pathId, updatedPath).catch(console.error);
      return updatedPath;
    }));
  };

  const saveModuleContent = (pathId: string, phaseId: string, moduleId: string, content: string) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = { 
        ...path, 
        phases: path.phases.map(phase => phase.id !== phaseId ? phase : { 
          ...phase, 
          modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, generatedContent: content } : mod) 
        }) 
      };
      api.updatePath(pathId, updatedPath).catch(console.error);
      return updatedPath;
    }));
  };

  const saveModuleCitations = (pathId: string, phaseId: string, moduleId: string, citations: ContentCitation[]) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = { 
        ...path, 
        phases: path.phases.map(phase => phase.id !== phaseId ? phase : { 
          ...phase, 
          modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, citations } : mod) 
        }) 
      };
      api.updatePath(pathId, updatedPath).catch(console.error);
      return updatedPath;
    }));
  };

  const addModuleResource = (pathId: string, phaseId: string, moduleId: string, resource: Resource) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        phases: path.phases.map(phase => phase.id !== phaseId ? phase : {
          ...phase,
          modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, resources: [...(mod.resources || []), resource] } : mod)
        })
      };
      api.updatePath(pathId, updatedPath).catch(console.error);
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
          phases: path.phases.map(phase => phase.id !== phaseId ? phase : {
            ...phase,
            modules: phase.modules.map(mod => mod.id === moduleId ? { ...mod, resources } : mod)
          })
        };
        console.log('🔄 [STORE] Sending update to backend...');
        api.updatePath(pathId, updatedPath)
          .then(() => console.log('✅ [STORE] Backend update successful'))
          .catch(err => console.error('❌ [STORE] Backend update failed:', err));
        return updatedPath;
      });
      console.log('🔄 [STORE] State updated, new first video:', newPath.find(p => p.id === pathId)?.phases.find(ph => ph.id === phaseId)?.modules.find(m => m.id === moduleId)?.resources.find(r => r.type === 'youtube')?.videoId);
      return newPath;
    });
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
      return updatedProfile;
    });
  };

  const updateSessionStatus = (pathId: string, sessionId: string, isCompleted: boolean) => {
    setPaths(prev => prev.map(path => {
      if (path.id !== pathId) return path;
      const updatedPath = {
        ...path,
        sessions: path.sessions?.map(s => s.id === sessionId ? { ...s, isCompleted } : s)
      };
      api.updatePath(pathId, updatedPath).catch(console.error);
      return updatedPath;
    }));
  };

  const resetData = () => {
    setPaths([]);
    setUserProfile(INITIAL_PROFILE);
    // Ideally we'd hit a reset endpoint on the backend too
  };

  return (
    <AppContext.Provider value={{
      paths, activePathId, userProfile, achievements, geometryAnchors, isCloudSynced,
      addPath, setActivePath: setActivePathId, updateModuleStatus, saveModuleNotes, saveModuleContent,
      saveModuleCitations, addModuleResource, replaceModuleResources, anchorGeometry, clearGeometryAnchors, deletePath, updateUserProfile, updateSessionStatus, resetData, refreshPaths
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
