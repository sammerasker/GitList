/**
 * Tests for configuration module
 */

import { resolveClientId, getClientIdErrorMessage } from '../../src/shared/config';

// Mock chrome storage
const mockGet = jest.fn();
(global.chrome.storage.local.get as jest.Mock) = mockGet;

describe('Config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveClientId', () => {
    it('should return injected client ID when available', async () => {
      // Mock the injected constant
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      
      mockGet.mockResolvedValue({});
      
      const clientId = await resolveClientId();
      
      expect(clientId).toBeTruthy();
      expect(typeof clientId).toBe('string');
      
      process.env = originalEnv;
    });

    it('should return developer override when dev mode enabled', async () => {
      const overrideId = 'test-override-id';
      
      mockGet.mockResolvedValue({
        devModeEnabled: true,
        githubClientIdOverride: overrideId
      });
      
      const clientId = await resolveClientId();
      
      expect(clientId).toBe(overrideId);
    });

    it('should ignore empty override strings', async () => {
      mockGet.mockResolvedValue({
        devModeEnabled: true,
        githubClientIdOverride: '   '
      });
      
      const clientId = await resolveClientId();
      
      expect(clientId).toBeTruthy();
      expect(clientId).not.toBe('   ');
    });

    it('should handle storage errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Storage error'));
      
      const clientId = await resolveClientId();
      
      expect(clientId).toBeTruthy();
    });
  });

  describe('getClientIdErrorMessage', () => {
    it('should return error message', () => {
      const message = getClientIdErrorMessage();
      
      expect(message).toBeTruthy();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });
});
