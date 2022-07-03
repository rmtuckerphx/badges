import { DateTime } from 'luxon';
import { Badges, EarnedBadge, Period, Rule } from '../src/Badges';
import emptyData from './data/emptyData.json';
import testData from './data/simpleData.json';
import testRules from './data/simpleRules.json';
import * as mockHelpers from './mockHelpers';

const tz = 'America/Phoenix';

describe('Badges', () => {
  // beforeEach(async () => {});

  afterEach(async () => {
    mockHelpers.cleanTimekeeper();
  });

  test('toJson() should return value passed to setData() plus initialized values', () => {
    const badges = new Badges(testRules as Rule[], tz);

    badges.setData(emptyData);
    const result = badges.toJson();

    expect(result.systemProps.isNewYear).toEqual(false);
    expect(result.systemProps.isNewMonth).toEqual(false);
    expect(result.systemProps.isNewDay).toEqual(false);
    expect(result.systemProps.isNewHour).toEqual(false);
    expect(result.systemProps.isNewWeek).toEqual(false);
    expect(result.systemProps.isNewSession).toEqual(false);
    expect(result.systemProps.isNewGame).toEqual(false);

    expect(result.periods![Period.Global].key).toEqual('GLOBAL');
    expect(result.periods![Period.Global].lastTimestamp).toEqual('1970-01-01T00:00:00.000Z');

    expect(result.periods![Period.Year].key).toEqual('1970');
    expect(result.periods![Period.Year].lastTimestamp).toEqual('1970-01-01T00:00:00.000Z');

    expect(result.periods![Period.Month].key).toEqual('1970-01');
    expect(result.periods![Period.Month].lastTimestamp).toEqual('1970-01-01T00:00:00.000Z');

    expect(result.periods![Period.Day].key).toEqual('1970-01-01');
    expect(result.periods![Period.Day].lastTimestamp).toEqual('1970-01-01T00:00:00.000Z');

    expect(result.periods![Period.Hour].key).toEqual('1970-01-01-H00');
    expect(result.periods![Period.Hour].lastTimestamp).toEqual('1970-01-01T00:00:00.000Z');

    expect(result.periods![Period.Week].key).toEqual('1970-W01');
    expect(result.periods![Period.Week].lastTimestamp).toEqual('1970-01-01T00:00:00.000Z');

    expect(result.periods![Period.Session].key).toEqual('0000000000');
    expect(result.periods![Period.Session].lastTimestamp).toEqual('1970-01-01T00:00:00.000Z');

    expect(result.periods![Period.Game].key).toEqual('0000000000');
    expect(result.periods![Period.Game].lastTimestamp).toEqual('1970-01-01T00:00:00.000Z');
  });

  test('setValue of gameCount to 1 should earn b01 badge', () => {
    const badges = new Badges(testRules as Rule[], tz);

    badges.setData(emptyData);
    badges.setValue('gameCount', 1);

    const earned = badges.getEarnedBadges();
    const result = badges.toJson();

    expect(result.props.gameCount).toEqual(1);

    expect(earned.length).toEqual(1);
    expect(earned[0].id).toEqual('b01');
    expect(earned[0].count).toEqual(1);

    expect(result.earned.length).toEqual(1);
    expect(result.earned[0].id).toEqual('b01');
    expect(result.earned[0].count).toEqual(1);
  });

  test('multiple setValue of gameCount to 1 should earn b01 badge only once', () => {
    const badges = new Badges(testRules as Rule[], tz);
    let earnedCounter = 0;

    badges.onBadgeEarned = (badge: EarnedBadge) => {
      earnedCounter++;
    };

    badges.setData(emptyData);
    badges.setValue('gameCount', 1);
    badges.setValue('gameCount', 1);

    const earned = badges.getEarnedBadges();
    const result = badges.toJson();

    expect(result.props.gameCount).toEqual(1);

    expect(earned.length).toEqual(1);
    expect(earned[0].id).toEqual('b01');
    expect(earned[0].count).toEqual(1);

    expect(result.earned.length).toEqual(1);
    expect(result.earned[0].id).toEqual('b01');
    expect(result.earned[0].count).toEqual(1);

    expect(earnedCounter).toEqual(1);
  });

  test('multiple addValue of gameCount to 1 should earn b01 badge only once', () => {
    const badges = new Badges(testRules as Rule[], tz);
    let earnedCounter = 0;

    badges.onBadgeEarned = (badge: EarnedBadge) => {
      earnedCounter++;
    };

    badges.setData(emptyData);
    badges.addValue('gameCount', 1);
    badges.addValue('gameCount');

    const earned = badges.getEarnedBadges();
    const result = badges.toJson();

    expect(result.props.gameCount).toEqual(2);

    expect(earned.length).toEqual(1);
    expect(earned[0].id).toEqual('b01');
    expect(earned[0].count).toEqual(1);

    expect(result.earned.length).toEqual(1);
    expect(result.earned[0].id).toEqual('b01');
    expect(result.earned[0].count).toEqual(1);

    expect(earnedCounter).toEqual(1);
  });

  test('multiple addValue across sessions should earn badge only once per session', () => {
    
    // create rule that only updates once per session
    const rules: Rule[] = [
      {
        id: 'r1',
        active: true,
        updatePeriod: Period.Session,
        condition: 'prop1 > 0',
      },
    ];

    const badges = new Badges(rules, tz);
    let earnedCounter = 0;
    let earned: EarnedBadge[];

    badges.onBadgeEarned = (badge: EarnedBadge) => {
      earnedCounter++;
    };

    badges.setData(emptyData);

    // start session 1
    badges.startSession();

    // add value twice, only 1 is updated due to session period
    badges.addValue('prop1');
    badges.addValue('prop1');

    // get badges earned during session 1
    earned = badges.getEarnedBadges(Period.Session);
    
    expect(earned.length).toEqual(1);
    expect(earned[0].id).toEqual('r1');
    expect(earned[0].count).toEqual(1);

    // start session 2
    badges.startSession();

    // no badges earned yet for session 2
    earned = badges.getEarnedBadges(Period.Session);
    expect(earned.length).toEqual(0);

    // add value during session 2
    badges.addValue('prop1');

    // get badges earned during session 2
    // count value is total, not just for session 2
    earned = badges.getEarnedBadges(Period.Session);

    expect(earned.length).toEqual(1);
    expect(earned[0].id).toEqual('r1');
    expect(earned[0].count).toEqual(2);

    // get badges earned during global
    earned = badges.getEarnedBadges(Period.Global);

    expect(earned.length).toEqual(1);
    expect(earned[0].id).toEqual('r1');
    expect(earned[0].count).toEqual(2);

    // get badge data
    const result = badges.toJson();

    // shows that prop1 property was incremented to 3
    expect(result.props.prop1).toEqual(3);

    // and that the r1 badge was earned twice
    expect(result.earned.length).toEqual(1);
    expect(result.earned[0].id).toEqual('r1');
    expect(result.earned[0].count).toEqual(2);

    // onBadgeEarned callback was called twice
    expect(earnedCounter).toEqual(2);
  });

  test('startSession should set values', () => {
    const badges = new Badges(testRules as Rule[], tz);

    badges.setData(emptyData);
    badges.startSession();

    const result = badges.toJson();

    expect(result.systemProps.isNewSession).toEqual(true);
    expect(result.periods![Period.Session].key).toEqual('0000000001');
  });

  test('startGame should set values', () => {
    const badges = new Badges(testRules as Rule[], tz);

    badges.setData(emptyData);
    badges.startGame();

    const result = badges.toJson();

    expect(result.systemProps.isNewGame).toEqual(true);
    expect(result.periods![Period.Game].key).toEqual('0000000001');
  });

  test('evaluate() should set period time values', () => {
    const time = DateTime.utc(2022, 7, 3, 1, 15).toJSDate();
    mockHelpers.mockTimeTravel(time);

    const badges = new Badges(testRules as Rule[], tz);

    badges.setData(emptyData);
    badges.evaluate();

    const result = badges.toJson();

    expect(result.systemProps.isNewYear).toEqual(true);
    expect(result.systemProps.isNewMonth).toEqual(true);
    expect(result.systemProps.isNewDay).toEqual(true);
    expect(result.systemProps.isNewHour).toEqual(true);
    expect(result.systemProps.isNewWeek).toEqual(true);

    expect(result.periods![Period.Year].key).toEqual('2022');
    expect(result.periods![Period.Year].lastTimestamp > '1970-01-01T00:00:00.000Z').toEqual(true);

    expect(result.periods![Period.Month].key).toEqual('2022-07');
    expect(result.periods![Period.Month].lastTimestamp > '1970-01-01T00:00:00.000Z').toEqual(true);

    expect(result.periods![Period.Day].key).toEqual('2022-07-02');
    expect(result.periods![Period.Day].lastTimestamp > '1970-01-01T00:00:00.000Z').toEqual(true);

    expect(result.periods![Period.Hour].key).toEqual('2022-07-02-H18');
    expect(result.periods![Period.Hour].lastTimestamp > '1970-01-01T00:00:00.000Z').toEqual(true);

    expect(result.periods![Period.Week].key).toEqual('2022-W26');
    expect(result.periods![Period.Week].lastTimestamp > '1970-01-01T00:00:00.000Z').toEqual(true);
  });
});
