import type { Op } from '../types';
import type { OpModule } from './types';
import { additionModule } from './addition';
import { subtractionModule } from './subtraction';

export const OPS: Record<Op, OpModule> = {
  '+': additionModule,
  '-': subtractionModule,
};
