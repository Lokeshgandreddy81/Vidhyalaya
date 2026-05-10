import { describe, bench } from 'vitest';
import { getVideosByTopic } from './videoLibrary';

describe('getVideosByTopic performance', () => {
  bench('search javascript with interests', () => {
    getVideosByTopic('javascript', 5, ['async', 'promises']);
  });

  bench('search python no interests', () => {
    getVideosByTopic('python', 5, []);
  });

  bench('search intro to react with interests', () => {
    getVideosByTopic('intro to react', 5, ['hooks', 'state', 'frontend']);
  });
});
