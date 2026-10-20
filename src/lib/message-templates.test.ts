import { describe, expect, it } from 'vitest';
import { fillTemplate, templatePlaceholders } from './message-templates';

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

  it("fills custom placeholders with the user's answers by trimmed name, literally and in the same pass", () => {
    expect(
      fillTemplate('{itemName} in {game}/{ pw } {game} {other}', { itemName: '{game}' }, { game: '{pw} $&', pw: 'x' }),
    ).toBe('{game} in {pw} $&/x {pw} $& {other}');
  });

  it('fills tokens from the conversation before the answers', () => {
    expect(fillTemplate('{price}', { price: '2 HR' }, { price: 'nope' })).toBe('2 HR');
  });
});

describe('templatePlaceholders', () => {
  it('lists the custom placeholders trimmed, deduped, in order of first appearance', () => {
    expect(templatePlaceholders('Join {game} / { pw }, {game} again, {Room 2} {a_b-c}')).toEqual([
      'game',
      'pw',
      'Room 2',
      'a_b-c',
    ]);
  });

  it('skips the reserved tokens, empty and malformed braces', () => {
    expect(
      templatePlaceholders(
        '{accountName} {characterName} {itemName} {price} {gameInfo} {} {   } {a.b} {x!} {' +
          'y'.repeat(25) +
          '} {unclosed',
      ),
    ).toEqual([]);
  });
});
