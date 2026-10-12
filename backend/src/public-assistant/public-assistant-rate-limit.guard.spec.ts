import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { PublicAssistantRateLimitGuard } from './public-assistant-rate-limit.guard';

function mockContext(
  ip: string,
  body: unknown = {},
  setHeader = jest.fn(),
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        body,
        socket: { remoteAddress: ip },
      }),
      getResponse: () => ({ setHeader }),
    }),
  } as unknown as ExecutionContext;
}

describe('PublicAssistantRateLimitGuard', () => {
  it('allows ten calls and rejects the next call with Retry-After', () => {
    const guard = new PublicAssistantRateLimitGuard();
    const setHeader = jest.fn();

    for (let count = 0; count < 10; count += 1) {
      expect(guard.canActivate(mockContext('192.0.2.1', {}, setHeader))).toBe(
        true,
      );
    }

    let thrown: unknown;
    try {
      guard.canActivate(mockContext('192.0.2.1', {}, setHeader));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  it('rejects an oversized request before processing it', () => {
    const guard = new PublicAssistantRateLimitGuard();
    expect(() =>
      guard.canActivate(
        mockContext('192.0.2.2', { message: 'x'.repeat(12_001) }),
      ),
    ).toThrow('Assistant request is too large');
  });

  it('tracks clients independently', () => {
    const guard = new PublicAssistantRateLimitGuard();
    for (let count = 0; count < 10; count += 1) {
      guard.canActivate(mockContext('192.0.2.3'));
    }
    expect(guard.canActivate(mockContext('192.0.2.4'))).toBe(true);
  });
});
