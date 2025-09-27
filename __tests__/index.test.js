"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
describe('DailyLoginAssistant', () => {
    test('should be defined', () => {
        expect(index_1.default).toBeDefined();
    });
    test('should have start method', () => {
        const assistant = new index_1.default();
        expect(typeof assistant.start).toBe('function');
    });
});
//# sourceMappingURL=index.test.js.map