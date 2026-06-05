/**
 * @deprecated NeuralSynthesizer has been replaced by KnowledgeMap.
 * This file re-exports the new component for backward compatibility.
 */
export { default } from './knowledge-map/KnowledgeMap';
export { legacyConceptMapToGraph } from './knowledge-map/graphValidator';

export type ConceptNode = {
  id: string;
  label: string;
  description: string;
  depth: number;
  parentId?: string;
  children?: string[];
  connections?: string[];
};

export type ConceptMap = {
  centralConcept: string;
  nodes: ConceptNode[];
  relationships: Array<{ from: string; to: string; label: string }>;
};
