import '@testing-library/jest-dom';
import * as axeMatchers from 'vitest-axe/matchers';
import { expect } from 'vitest';
import "vitest-axe/extend-expect";

expect.extend(axeMatchers);
