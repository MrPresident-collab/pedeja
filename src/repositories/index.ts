import type { Repositories } from './types';
import { createMockRepositories } from './mock';

export const repositories: Repositories = createMockRepositories();

export type { Repositories } from './types';