import { bench, describe } from 'vitest';
import { getVideosByTopic } from './videoLibrary';

describe('getVideosByTopic performance', () => {
  bench('getVideosByTopic with complex inputs', () => {
    // Calling with a mix of topics and user interests to exercise the matching logic
    getVideosByTopic('react javascript web development', 10, ['frontend', 'react', 'css']);
    getVideosByTopic('machine learning python data science', 10, ['ai', 'math', 'python']);
    getVideosByTopic('aws cloud infrastructure', 10, ['docker', 'kubernetes', 'aws']);
    getVideosByTopic('java system design', 10, ['backend', 'architecture', 'java']);
  });
});
