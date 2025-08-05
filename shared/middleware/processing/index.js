/**
 * Processing Middleware
 * 
 * This module exports all data processing related middleware
 * for the Marketplace Backend application.
 * 
 * @author Marketplace Team
 * @version 2.0.0
 */

const imageProcessor = require('./imageProcessor');

module.exports = {
  // Image processing middleware
  imageProcessor,
  
  // Convenience exports
  processImages: imageProcessor,
  
  // Future processing middleware can be added here
  // textProcessor: require('./textProcessor'),
  // fileProcessor: require('./fileProcessor'),
};
