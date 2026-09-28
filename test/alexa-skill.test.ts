import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Runs alexa-skill/index.js with a minimal stand-in for ask-sdk-core, so the
// handlers can be exercised without the Alexa service.
type Directive = { type: string; audioItem?: { stream: { url: string; token: string } } };
type Handler = { canHandle(h: unknown): boolean; handle(h: unknown): { directives: Directive[] } };

function loadSkill(): Handler[] {
  const code = readFileSync(new URL('../alexa-skill/index.js', import.meta.url), 'utf8');
  let handlers: Handler[] = [];
  const Alexa = {
    getRequestType: (env: { request: { type: string } }) => env.request.type,
    getIntentName: (env: { request: { intent: { name: string } } }) => env.request.intent.name,
    getSlot: () => undefined,
    SkillBuilders: {
      custom: () => {
        const builder = {
          addRequestHandlers: (...hs: Handler[]) => ((handlers = hs), builder),
          addErrorHandlers: () => builder,
          lambda: () => () => {},
        };
        return builder;
      },
    },
  };
  const module = { exports: {} };
  new Function('require', 'exports', 'module', 'console', code)(
    () => Alexa,
    module.exports,
    module,
    { log: () => {} },
  );
  return handlers;
}

function responseBuilder() {
  const directives: Directive[] = [];
  const rb = {
    addAudioPlayerPlayDirective: (_b: string, url: string, token: string) => {
      directives.push({ type: 'AudioPlayer.Play', audioItem: { stream: { url, token } } });
      return rb;
    },
    withShouldEndSession: () => rb,
    speak: () => rb,
    getResponse: () => ({ directives }),
  };
  return rb;
}

function playbackFailed(token: string) {
  const handlers = loadSkill();
  const input = {
    requestEnvelope: { request: { type: 'AudioPlayer.PlaybackFailed', token, error: {} }, context: {} },
    responseBuilder: responseBuilder(),
  };
  return handlers.find((h) => h.canHandle(input))!.handle(input).directives;
}

describe('Alexa skill: failed stations', () => {
  it('skips a failed station to the next one', () => {
    const [play] = playbackFailed('5'); // National FM
    expect(play.audioItem!.stream.token).toBe('6~1'); // Zu, first skip
    expect(play.audioItem!.stream.url).toContain('radiozu');
  });

  it('keeps counting skips in a row', () => {
    expect(playbackFailed('6~1')[0].audioItem!.stream.token).toBe('7~2');
  });

  it('wraps from the last station to the first', () => {
    expect(playbackFailed('25')[0].audioItem!.stream.token).toBe('1~1');
  });

  it('gives up after three failures in a row', () => {
    expect(playbackFailed('7~3')).toEqual([]);
  });

  it('ignores an unknown token', () => {
    expect(playbackFailed('nonsense')).toEqual([]);
  });
});
