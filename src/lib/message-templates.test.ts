import { describe, expect, it } from 'vitest';
import { fillTemplate } from './message-templates';

describe('fillTemplate', () => {
  it('replaces every occurrence of each token', () => {
    expect(fillTemplate('{item} for {price}, {item}!', { item: 'Shako', price: '2 ist' })).toBe(
      'Shako for 2 ist, Shako!',
    );
  });

  it('blanks tokens whose value is missing', () => {
    expect(fillTemplate('Hi {accountName}, game {gameInfo}', { accountName: undefined, gameInfo: null })).toBe(
      'Hi , game ',
    );
  });

  it('leaves tokens it was not given as typed', () => {
    expect(fillTemplate('Game: {gameInfo} {constructor}', { price: '1' })).toBe('Game: {gameInfo} {constructor}');
  });

  it('inserts values literally, without re-expanding tokens or replacement patterns in them', () => {
    expect(fillTemplate('{a} {b}', { a: '{b} $& $1', b: 'x' })).toBe('{b} $& $1 x');
  });

  it('stringifies numbers', () => {
    expect(fillTemplate('{price} HR', { price: 1.5 })).toBe('1.5 HR');
  });
});
