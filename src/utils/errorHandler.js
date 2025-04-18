//utils/errorHandler.js

/**
 * Wrapper for async controller methods to handle errors consistently
 * @param {Function} fn The async controller function to wrap
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => 
    Promise.resolve(fn(req, res, next)).catch(error => {
      console.error(`Error in ${fn.name || 'anonymous function'}:`, error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message
      });
    });
  
  /**
   * Standard API response format
   */
  export class ApiResponse {
    /**
     * Send success response
     * @param {Object} res Express response object
     * @param {string} message Success message
     * @param {Object} data Response data
     * @param {number} statusCode HTTP status code (default: 200)
     */
    static success(res, message, data = {}, statusCode = 200) {
      return res.status(statusCode).json({
        success: true,
        message,
        data
      });
    }
  
    /**
     * Send error response
     * @param {Object} res Express response object
     * @param {string} message Error message
     * @param {number} statusCode HTTP status code (default: 400)
     * @param {string|Object} error Error details
     */
    static error(res, message, statusCode = 400, error = null) {
      const response = {
        success: false,
        message
      };
      
      if (error && process.env.NODE_ENV !== 'production') {
        response.error = error;
      }
      
      return res.status(statusCode).json(response);
    }
  }