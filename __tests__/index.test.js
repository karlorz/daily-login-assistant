"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
describe('DailyLoginAssistant', () => {
    test('should be defined', () => {
        expect(index_1.default).toBeDefined();
    });
    test('should have start method', () => {
        expect(typeof index_1.default.start).toBe('function');
    });
});
//# sourceMappingURL=index.test.js.map