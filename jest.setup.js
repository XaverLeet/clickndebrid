// Set up the Jest globals for ESM usage

global.jest = global.jest || {};
global.afterAll = global.afterAll || (() => {});
global.afterEach = global.afterEach || (() => {});
global.beforeAll = global.beforeAll || (() => {});
global.beforeEach = global.beforeEach || (() => {});
global.describe = global.describe || (() => {});
global.expect = global.expect || (() => {});
global.it = global.it || (() => {});
global.test = global.test || (() => {});

// Export the globals for ESM modules to import
export default {
  jest: global.jest,
  afterAll: global.afterAll,
  afterEach: global.afterEach,
  beforeAll: global.beforeAll,
  beforeEach: global.beforeEach,
  describe: global.describe,
  expect: global.expect,
  it: global.it,
  test: global.test
};