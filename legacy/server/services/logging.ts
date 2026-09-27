import fs from 'fs';
import path from 'path';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  AUDIT = 'AUDIT'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  metadata?: any;
}

class LoggingService {
  private logFilePath: string;
  private inMemoryLogs: LogEntry[] = [];
  private maxInMemoryLogs = 1000;

  constructor() {
    this.logFilePath = path.join(process.cwd(), 'server-logs.txt');
  }

  private writeToFile(entry: LogEntry) {
    const formatted = `[${entry.timestamp}] [${entry.level}] [${entry.context}]: ${entry.message} ${entry.metadata ? JSON.stringify(entry.metadata) : ''}\n`;
    fs.appendFile(this.logFilePath, formatted, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }

  public log(level: LogLevel, context: string, message: string, metadata?: any): LogEntry {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      metadata
    };

    // Keep standard console.log output synchronized
    const consoleMsg = `[${entry.timestamp}] [${level}] [${context}] ${message}`;
    if (level === LogLevel.ERROR) {
      console.error(consoleMsg, metadata || '');
    } else if (level === LogLevel.WARN) {
      console.warn(consoleMsg, metadata || '');
    } else {
      console.log(consoleMsg, metadata || '');
    }

    // Update state cache
    this.inMemoryLogs.unshift(entry);
    if (this.inMemoryLogs.length > this.maxInMemoryLogs) {
      this.inMemoryLogs.pop();
    }

    // Write to persistent file
    this.writeToFile(entry);

    return entry;
  }

  public info(context: string, message: string, metadata?: any): LogEntry {
    return this.log(LogLevel.INFO, context, message, metadata);
  }

  public warn(context: string, message: string, metadata?: any): LogEntry {
    return this.log(LogLevel.WARN, context, message, metadata);
  }

  public error(context: string, message: string, metadata?: any): LogEntry {
    return this.log(LogLevel.ERROR, context, message, metadata);
  }

  public debug(context: string, message: string, metadata?: any): LogEntry {
    return this.log(LogLevel.DEBUG, context, message, metadata);
  }

  public audit(context: string, message: string, metadata?: any): LogEntry {
    return this.log(LogLevel.AUDIT, context, message, metadata);
  }

  public getLogs(limit = 100, level?: LogLevel): LogEntry[] {
    let filtered = this.inMemoryLogs;
    if (level) {
      filtered = filtered.filter(l => l.level === level);
    }
    return filtered.slice(0, limit);
  }

  public clearLogs() {
    this.inMemoryLogs = [];
    if (fs.existsSync(this.logFilePath)) {
      try {
        fs.writeFileSync(this.logFilePath, '');
      } catch (e) {
        this.error('LoggingService', 'Failed to clear physical log file', e);
      }
    }
  }
}

export const logger = new LoggingService();
