import DailyLoginAssistant from '../src/index';

describe('DailyLoginAssistant', () => {
  test('should be defined', () => {
    expect(DailyLoginAssistant).toBeDefined();
  });

  test('should have start method', () => {
    expect(typeof DailyLoginAssistant.start).toBe('function');
  });
});