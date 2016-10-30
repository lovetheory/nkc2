global.__projectroot = __dirname + '/';//create global variable for project root directory

global.environment = process.env.NODE_ENV?process.env.NODE_ENV:'development';
global.development = environment !== 'production';
console.log('running in '+environment+' mode');
