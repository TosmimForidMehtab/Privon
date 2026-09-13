export class PrivonError extends Error {
  constructor(message, code = 'PRIVON_ERROR', cause) {
    super(message, { cause });
    this.name = 'PrivonError';
    this.code = code;
  }
}

export class ConfigurationError extends PrivonError {
  constructor(message) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class AIResponseError extends PrivonError {
  constructor(message, cause) {
    super(message, 'AI_RESPONSE_ERROR', cause);
    this.name = 'AIResponseError';
  }
}
