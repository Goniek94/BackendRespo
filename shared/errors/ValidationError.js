import CustomError from './CustomError.js';

class ValidationError extends CustomError {
  constructor(message) {
    super(message, 400); // 400 - kod HTTP dla błędów walidacji
  }
}

export default ValidationError;
