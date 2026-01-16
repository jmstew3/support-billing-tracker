import cron from 'node-cron';
import FluentSyncService from './FluentSyncService.js';
import logger from './logger.js';

/**
 * Scheduler Service
 *
 * Handles automatic scheduling of recurring tasks:
 * - FluentSupport ticket sync (6 AM and 6 PM EST)
 * - MySQL backups (future)
 *
 * Uses node-cron with timezone support
 */
class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.scheduleConfig = {
      fluentSync: {
        // Cron expressions in EST/America/New_York timezone
        // "0 6 * * *" = 6:00 AM every day
        // "0 18 * * *" = 6:00 PM every day
        schedules: [
          { expression: '0 6 * * *', description: '6:00 AM EST' },
          { expression: '0 18 * * *', description: '6:00 PM EST' }
        ],
        timezone: 'America/New_York',
        enabled: true,
        // Default date filter: 14 days ago to catch any missed tickets
        defaultDateFilter: () => {
          const date = new Date();
          date.setDate(date.getDate() - 14);
          return date.toISOString().split('T')[0];
        }
      }
    };
  }

  /**
   * Initialize all scheduled jobs
   */
  initialize() {
    logger.info('Initializing scheduler service...');

    // Initialize FluentSupport sync jobs
    if (this.scheduleConfig.fluentSync.enabled) {
      this._initializeFluentSyncJobs();
    }

    logger.info('Scheduler service initialized', {
      activeJobs: this.jobs.size,
      jobs: Array.from(this.jobs.keys())
    });
  }

  /**
   * Initialize FluentSupport sync cron jobs
   * @private
   */
  _initializeFluentSyncJobs() {
    const { schedules, timezone } = this.scheduleConfig.fluentSync;

    schedules.forEach((schedule, index) => {
      const jobName = `fluent-sync-${index + 1}`;

      // Validate cron expression
      if (!cron.validate(schedule.expression)) {
        logger.error('Invalid cron expression', {
          jobName,
          expression: schedule.expression
        });
        return;
      }

      const job = cron.schedule(
        schedule.expression,
        async () => {
          await this._runFluentSync(jobName, schedule.description);
        },
        {
          timezone,
          scheduled: true
        }
      );

      this.jobs.set(jobName, {
        job,
        type: 'fluent-sync',
        schedule: schedule.expression,
        description: schedule.description,
        timezone,
        lastRun: null,
        lastStatus: null
      });

      logger.info('Scheduled FluentSupport sync job', {
        jobName,
        schedule: schedule.expression,
        description: schedule.description,
        timezone
      });
    });
  }

  /**
   * Run FluentSupport sync (called by cron or manually)
   * @private
   * @param {string} jobName - Name of the job for logging
   * @param {string} description - Human-readable description
   */
  async _runFluentSync(jobName, description) {
    const startTime = Date.now();
    logger.info('Starting scheduled FluentSupport sync', {
      jobName,
      description,
      timestamp: new Date().toISOString()
    });

    try {
      const dateFilter = this.scheduleConfig.fluentSync.defaultDateFilter();
      const result = await FluentSyncService.syncTickets(dateFilter);

      const duration = Date.now() - startTime;

      // Update job status
      const jobInfo = this.jobs.get(jobName);
      if (jobInfo) {
        jobInfo.lastRun = new Date().toISOString();
        jobInfo.lastStatus = 'success';
        jobInfo.lastResult = result;
      }

      logger.info('FluentSupport sync completed', {
        jobName,
        description,
        duration: `${duration}ms`,
        ticketsFetched: result.ticketsFetched,
        ticketsAdded: result.ticketsAdded,
        ticketsUpdated: result.ticketsUpdated,
        ticketsSkipped: result.ticketsSkipped
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Update job status
      const jobInfo = this.jobs.get(jobName);
      if (jobInfo) {
        jobInfo.lastRun = new Date().toISOString();
        jobInfo.lastStatus = 'failed';
        jobInfo.lastError = error.message;
      }

      logger.error('FluentSupport sync failed', {
        jobName,
        description,
        duration: `${duration}ms`,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Manually trigger FluentSupport sync
   * @param {string} dateFilter - Optional date filter (defaults to 14 days ago)
   * @returns {Promise<Object>} Sync result
   */
  async triggerFluentSync(dateFilter) {
    const filter = dateFilter || this.scheduleConfig.fluentSync.defaultDateFilter();

    logger.info('Manual FluentSupport sync triggered', { dateFilter: filter });

    try {
      const result = await FluentSyncService.syncTickets(filter);

      // Update the first job's status to reflect manual run
      const jobInfo = this.jobs.get('fluent-sync-1');
      if (jobInfo) {
        jobInfo.lastRun = new Date().toISOString();
        jobInfo.lastStatus = 'success';
        jobInfo.lastResult = result;
      }

      return result;
    } catch (error) {
      // Update job status on failure
      const jobInfo = this.jobs.get('fluent-sync-1');
      if (jobInfo) {
        jobInfo.lastRun = new Date().toISOString();
        jobInfo.lastStatus = 'failed';
        jobInfo.lastError = error.message;
      }
      throw error;
    }
  }

  /**
   * Get status of all scheduled jobs
   * @returns {Object} Status information for all jobs
   */
  getStatus() {
    const status = {
      schedulerActive: true,
      jobs: {},
      nextRuns: []
    };

    this.jobs.forEach((jobInfo, jobName) => {
      status.jobs[jobName] = {
        type: jobInfo.type,
        schedule: jobInfo.schedule,
        description: jobInfo.description,
        timezone: jobInfo.timezone,
        lastRun: jobInfo.lastRun,
        lastStatus: jobInfo.lastStatus,
        lastError: jobInfo.lastError || null
      };

      // Calculate next run time
      // node-cron doesn't directly expose next run, so we compute it
      const nextRun = this._getNextRunTime(jobInfo.schedule, jobInfo.timezone);
      if (nextRun) {
        status.nextRuns.push({
          jobName,
          nextRun: nextRun.toISOString(),
          description: jobInfo.description
        });
      }
    });

    // Sort next runs by time
    status.nextRuns.sort((a, b) => new Date(a.nextRun) - new Date(b.nextRun));

    return status;
  }

  /**
   * Calculate next run time for a cron expression
   * @private
   * @param {string} cronExpression - Cron expression
   * @param {string} timezone - Timezone
   * @returns {Date|null} Next run time
   */
  _getNextRunTime(cronExpression, timezone) {
    try {
      // Parse cron expression: minute hour dayOfMonth month dayOfWeek
      const parts = cronExpression.split(' ');
      if (parts.length !== 5) return null;

      const [minute, hour] = parts;
      const now = new Date();

      // Create a date in the target timezone for today at the scheduled time
      const targetTime = new Date();
      targetTime.setHours(parseInt(hour), parseInt(minute), 0, 0);

      // If the time has passed today, schedule for tomorrow
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      return targetTime;
    } catch {
      return null;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    logger.info('Stopping scheduler service...');

    this.jobs.forEach((jobInfo, jobName) => {
      jobInfo.job.stop();
      logger.info('Stopped scheduled job', { jobName });
    });

    this.jobs.clear();
    logger.info('Scheduler service stopped');
  }

  /**
   * Enable/disable FluentSupport sync scheduling
   * @param {boolean} enabled - Whether to enable scheduling
   */
  setFluentSyncEnabled(enabled) {
    this.scheduleConfig.fluentSync.enabled = enabled;

    if (enabled) {
      this._initializeFluentSyncJobs();
    } else {
      // Stop existing fluent sync jobs
      this.jobs.forEach((jobInfo, jobName) => {
        if (jobInfo.type === 'fluent-sync') {
          jobInfo.job.stop();
          this.jobs.delete(jobName);
        }
      });
    }

    logger.info('FluentSupport sync scheduling updated', { enabled });
  }
}

// Export singleton instance
export default new SchedulerService();
