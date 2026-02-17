/**
 * Tests for shared utility functions
 */

import { createListId } from '../../src/shared/utils';

describe('Utils', () => {
  describe('createListId', () => {
    it('should create a consistent ID from URL and name', () => {
      const url = 'https://github.com/stars/user/lists/my-list';
      const name = 'My List';
      
      const id1 = createListId(url, name);
      const id2 = createListId(url, name);
      
      expect(id1).toBe(id2);
      expect(id1).toBeTruthy();
      expect(typeof id1).toBe('string');
    });

    it('should create different IDs for different URLs', () => {
      const url1 = 'https://github.com/stars/user/lists/list1';
      const url2 = 'https://github.com/stars/user/lists/list2';
      const name = 'My List';
      
      const id1 = createListId(url1, name);
      const id2 = createListId(url2, name);
      
      expect(id1).not.toBe(id2);
    });

    it('should create different IDs for different names', () => {
      const url1 = 'https://github.com/stars/user/lists/list-1';
      const url2 = 'https://github.com/stars/user/lists/list-2';
      const name1 = 'List 1';
      const name2 = 'List 2';
      
      const id1 = createListId(url1, name1);
      const id2 = createListId(url2, name2);
      
      expect(id1).not.toBe(id2);
    });

    it('should handle special characters in URL and name', () => {
      const url = 'https://github.com/stars/user-name/lists/my-list-123';
      const name = 'My List #1 (Test)';
      
      const id = createListId(url, name);
      
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });
  });
});
