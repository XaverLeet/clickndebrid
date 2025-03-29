// This is a CommonJS mock for chalk in testing environment

// Create a chainable function factory
function createChalkFunction(wrapper) {
  const fn = (...args) => args.join(' ');
  
  // Add all the color methods
  const colors = [
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey',
    'blackBright', 'redBright', 'greenBright', 'yellowBright', 'blueBright', 'magentaBright', 
    'cyanBright', 'whiteBright'
  ];
  
  // Add background color methods
  const bgColors = [
    'bgBlack', 'bgRed', 'bgGreen', 'bgYellow', 'bgBlue', 'bgMagenta', 'bgCyan', 'bgWhite',
    'bgBlackBright', 'bgRedBright', 'bgGreenBright', 'bgYellowBright', 'bgBlueBright', 
    'bgMagentaBright', 'bgCyanBright', 'bgWhiteBright'
  ];
  
  // Add formatting methods
  const formats = [
    'reset', 'bold', 'dim', 'italic', 'underline', 'inverse', 'hidden', 'strikethrough',
    'visible'
  ];
  
  // Helper to create chainable methods
  function createChainableMethod(obj, name) {
    Object.defineProperty(obj, name, {
      get() {
        const nextFn = createChalkFunction(`${wrapper ? wrapper + '.' : ''}${name}`);
        return nextFn;
      }
    });
  }
  
  // Add all methods to our function
  colors.forEach(color => createChainableMethod(fn, color));
  bgColors.forEach(color => createChainableMethod(fn, color));
  formats.forEach(format => createChainableMethod(fn, format));
  
  return fn;
}

// Create the main chalk instance
const chalk = createChalkFunction();

// Add supportsColor property
chalk.supportsColor = {
  level: 3,
  hasBasic: true,
  has256: true,
  has16m: true
};

// Add level property
chalk.level = 3;

module.exports = chalk;
module.exports.default = chalk;