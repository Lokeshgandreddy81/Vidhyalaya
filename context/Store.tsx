import React, { createContext, useContext, useState, useEffect } from 'react';
import { LearningPath, LearningPhase, StudyModule, Resource, UserProfile, Achievement } from '../types';
import { api } from '../services/api';

interface AppState {
  paths: LearningPath[];
  userProfile: UserProfile;
  achievements: Achievement[];
  activePathId: string | null;
  isCloudSynced: boolean;
  addPath: (path: LearningPath) => void;
  setActivePath: (id: string) => void;
  updateModuleStatus: (pathId: string, phaseId: string, moduleId: string, isCompleted: boolean) => void;
  saveModuleNotes: (pathId: string, phaseId: string, moduleId: string, notes: string) => void;
  saveModuleContent: (pathId: string, phaseId: string, moduleId: string, content: string) => void;
  addModuleResource: (pathId: string, phaseId: string, moduleId: string, resource: Resource) => void;
  deletePath: (id: string) => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  resetData: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const INITIAL_PROFILE: UserProfile = {
  name: 'Scholar',
  email: '',
  xp: 0,
  level: 1,
  streakDays: 1,
  joinedAt: new Date().toISOString()
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [profile, userPaths] = await Promise.all([
          api.getUserProfile(),
          api.getUserPaths()
        ]);
        
        if (profile) setUserProfile(profile as UserProfile);
        if (userPaths && userPaths.length > 0) setPaths(userPaths);
        
        setIsCloudSynced(true);
      } catch (e) { 
        console.error('Failed to fetch data from backend:', e);
      }
    };
    fetchInitialData();
  }, []);

  const addPath = (path: LearningPath) => {
    setPaths(prev => [path, ...prev]);
    api.createPath(path).catch(console.error);
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
  
  const resetData = () => {
    setPaths([]);
    setUserProfile(INITIAL_PROFILE);
    // Ideally we'd hit a reset endpoint on the backend too
  };

  return (
    <AppContext.Provider value={{ 
      paths, activePathId, userProfile, achievements, isCloudSynced,
      addPath, setActivePath: setActivePathId, updateModuleStatus, saveModuleNotes, saveModuleContent,
      addModuleResource, deletePath, updateUserProfile, resetData 
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