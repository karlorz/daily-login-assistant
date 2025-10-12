import { InMemoryTaskQueue } from '../../../src/infrastructure/queue/in-memory-task-queue.service.js';
import { LoginTask, TaskPriority, TaskStatus } from '../../../src/core/entities/index.js';

describe('InMemoryTaskQueue', () => {
  let queue: InMemoryTaskQueue;

  beforeEach(() => {
    queue = new InMemoryTaskQueue();
  });

  describe('enqueue and dequeue', () => {
    it('should enqueue and dequeue a task', () => {
      const task = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task);
      expect(queue.getQueueSize()).toBe(1);

      const dequeuedTask = queue.dequeue();
      expect(dequeuedTask).not.toBeNull();
      expect(dequeuedTask?.id).toBe('task1');
      expect(queue.getQueueSize()).toBe(0);
      expect(queue.getProcessingCount()).toBe(1);
    });

    it('should return null when dequeuing from empty queue', () => {
      const task = queue.dequeue();
      expect(task).toBeNull();
    });

    it('should process tasks in FIFO order', () => {
      const task1 = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);
      const task2 = new LoginTask('task2', 'account2', 'website2', TaskPriority.NORMAL, new Date(), 3);
      const task3 = new LoginTask('task3', 'account3', 'website3', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task1);
      queue.enqueue(task2);
      queue.enqueue(task3);

      expect(queue.dequeue()?.id).toBe('task1');
      expect(queue.dequeue()?.id).toBe('task2');
      expect(queue.dequeue()?.id).toBe('task3');
    });

    it('should update task status to PROCESSING when dequeued', () => {
      const task = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task);
      const dequeuedTask = queue.dequeue();

      expect(dequeuedTask?.status).toBe(TaskStatus.PROCESSING);
    });
  });

  describe('complete', () => {
    it('should move task from processing to completed', () => {
      const task = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task);
      queue.dequeue();
      queue.complete('task1');

      expect(queue.getProcessingCount()).toBe(0);
      expect(queue.getCompletedTasks().length).toBe(1);
      expect(queue.getCompletedTasks()[0].id).toBe('task1');
      expect(queue.getCompletedTasks()[0].status).toBe(TaskStatus.COMPLETED);
    });

    it('should not affect queue if task id not found', () => {
      const task = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task);
      queue.dequeue();
      queue.complete('nonexistent');

      expect(queue.getProcessingCount()).toBe(1);
      expect(queue.getCompletedTasks().length).toBe(0);
    });
  });

  describe('fail', () => {
    it('should move task from processing to failed with error message', () => {
      const task = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task);
      queue.dequeue();
      queue.fail('task1', 'Connection timeout');

      expect(queue.getProcessingCount()).toBe(0);
      expect(queue.getFailedTasks().length).toBe(1);
      expect(queue.getFailedTasks()[0].id).toBe('task1');
      expect(queue.getFailedTasks()[0].status).toBe(TaskStatus.FAILED);
      expect(queue.getFailedTasks()[0].errorMessage).toBe('Connection timeout');
    });

    it('should not affect queue if task id not found', () => {
      const task = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task);
      queue.dequeue();
      queue.fail('nonexistent', 'Error');

      expect(queue.getProcessingCount()).toBe(1);
      expect(queue.getFailedTasks().length).toBe(0);
    });
  });

  describe('retry', () => {
    it('should move task from failed back to pending with incremented attempt', () => {
      const task = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task);
      queue.dequeue();
      queue.fail('task1', 'Timeout');

      const initialAttempt = task.attempt;
      queue.retry('task1');

      expect(queue.getFailedTasks().length).toBe(0);
      expect(queue.getQueueSize()).toBe(1);

      const retriedTask = queue.dequeue();
      expect(retriedTask?.status).toBe(TaskStatus.PROCESSING);
      expect(retriedTask?.attempt).toBe(initialAttempt + 1);
    });

    it('should not affect queue if task id not found', () => {
      queue.retry('nonexistent');
      expect(queue.getQueueSize()).toBe(0);
    });
  });

  describe('getters', () => {
    it('should return correct queue size', () => {
      expect(queue.getQueueSize()).toBe(0);

      queue.enqueue(new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3));
      expect(queue.getQueueSize()).toBe(1);

      queue.enqueue(new LoginTask('task2', 'account2', 'website2', TaskPriority.NORMAL, new Date(), 3));
      expect(queue.getQueueSize()).toBe(2);

      queue.dequeue();
      expect(queue.getQueueSize()).toBe(1);
    });

    it('should return correct processing count', () => {
      expect(queue.getProcessingCount()).toBe(0);

      queue.enqueue(new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3));
      queue.dequeue();
      expect(queue.getProcessingCount()).toBe(1);

      queue.enqueue(new LoginTask('task2', 'account2', 'website2', TaskPriority.NORMAL, new Date(), 3));
      queue.dequeue();
      expect(queue.getProcessingCount()).toBe(2);
    });

    it('should return copies of completed tasks', () => {
      const task = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task);
      queue.dequeue();
      queue.complete('task1');

      const completed1 = queue.getCompletedTasks();
      const completed2 = queue.getCompletedTasks();

      expect(completed1).not.toBe(completed2);
      expect(completed1.length).toBe(1);
      expect(completed2.length).toBe(1);
    });

    it('should return copies of failed tasks', () => {
      const task = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task);
      queue.dequeue();
      queue.fail('task1', 'Error');

      const failed1 = queue.getFailedTasks();
      const failed2 = queue.getFailedTasks();

      expect(failed1).not.toBe(failed2);
      expect(failed1.length).toBe(1);
      expect(failed2.length).toBe(1);
    });

    it('should return all tasks grouped by status', () => {
      const task1 = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);
      const task2 = new LoginTask('task2', 'account2', 'website2', TaskPriority.NORMAL, new Date(), 3);
      const task3 = new LoginTask('task3', 'account3', 'website3', TaskPriority.NORMAL, new Date(), 3);
      const task4 = new LoginTask('task4', 'account4', 'website4', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task1);
      queue.enqueue(task2);
      queue.dequeue(); // task1 processing
      queue.complete('task1');

      queue.enqueue(task3);
      queue.dequeue(); // task2 processing
      queue.fail('task2', 'Error');

      queue.enqueue(task4); // task4 pending

      const allTasks = queue.getAllTasks();

      expect(allTasks.pending.length).toBe(2); // task3, task4
      expect(allTasks.processing.length).toBe(0);
      expect(allTasks.completed.length).toBe(1); // task1
      expect(allTasks.failed.length).toBe(1); // task2
    });
  });

  describe('clear operations', () => {
    it('should clear completed tasks', () => {
      const task = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task);
      queue.dequeue();
      queue.complete('task1');

      expect(queue.getCompletedTasks().length).toBe(1);
      queue.clearCompleted();
      expect(queue.getCompletedTasks().length).toBe(0);
    });

    it('should clear failed tasks', () => {
      const task = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task);
      queue.dequeue();
      queue.fail('task1', 'Error');

      expect(queue.getFailedTasks().length).toBe(1);
      queue.clearFailed();
      expect(queue.getFailedTasks().length).toBe(0);
    });

    it('should not affect pending or processing tasks when clearing', () => {
      const task1 = new LoginTask('task1', 'account1', 'website1', TaskPriority.NORMAL, new Date(), 3);
      const task2 = new LoginTask('task2', 'account2', 'website2', TaskPriority.NORMAL, new Date(), 3);
      const task3 = new LoginTask('task3', 'account3', 'website3', TaskPriority.NORMAL, new Date(), 3);

      queue.enqueue(task1);
      queue.enqueue(task2);
      queue.dequeue();
      queue.complete('task1');

      queue.enqueue(task3);
      queue.dequeue();
      queue.fail('task2', 'Error');

      queue.clearCompleted();
      queue.clearFailed();

      expect(queue.getQueueSize()).toBe(1); // task3 still pending
      expect(queue.getProcessingCount()).toBe(0);
    });
  });
});
