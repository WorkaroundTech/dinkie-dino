// The command-line simulator. Build and run with `npm run sim -- <options>`.
import { fixedOffsetLocalTime, DEFAULT_SETTINGS } from '../../src/core';
import type { Context, Pacing } from '../../src/core';
import { simulateLife } from './life';
import { tuningWithOverrides } from './overrides';
import type { DietPlan, Player } from './players';
import { builtInPlayers } from './players';
import { formatReport } from './report';
import type { PlayerResult } from './report';
import { summarize } from './stats';

const HELP = `Dinkie Dino simulator

  npm run sim -- [options]

  --lives N            lives per player (default 300)
  --players a,b,...    absent, unfed, morning, evening, every4h, every8h, away24, away48, twice, thrice, hourly, quarterly, or all (default: all but quarterly)
  --pacing P           normal (the AC wants a look every ~4 h) or relaxed (every ~8 h) (default normal)
  --room real|calm     calm = the room never changes temperature, to look at the needs alone (default real)
  --diet D             meat, plant, noodles or mixed (default mixed)
  --days N             longest life to simulate, in days (default 30)
  --seed N             first seed (default 1)
  --set path=value     override a tuning number; repeatable, e.g. --set temperature.moveChance=0.06
  --json               print the raw summaries as JSON
`;

function parseArgs(argv: string[]) {
  const options = {
    lives: 300,
    players: 'default',
    room: 'real',
    pacing: 'normal',
    diet: 'mixed' as DietPlan,
    days: 30,
    seed: 1,
    json: false,
    sets: [] as string[],
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? '';
    const value = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${arg} needs a value`);
      return v;
    };
    switch (arg) {
      case '--lives':
        options.lives = Number(value());
        break;
      case '--players':
        options.players = value();
        break;
      case '--room':
        options.room = value();
        break;
      case '--pacing':
        options.pacing = value();
        break;
      case '--diet':
        options.diet = value() as DietPlan;
        break;
      case '--days':
        options.days = Number(value());
        break;
      case '--seed':
        options.seed = Number(value());
        break;
      case '--set':
        options.sets.push(value());
        break;
      case '--json':
        options.json = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option ${arg}\n\n${HELP}`);
    }
  }
  return options;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }

  if (options.pacing !== 'normal' && options.pacing !== 'relaxed')
    throw new Error('--pacing must be normal or relaxed');
  const pacing: Pacing = options.pacing;
  const overrides = [...options.sets];
  if (options.room === 'calm') overrides.push('temperature.moveChance=0');
  else if (options.room !== 'real') throw new Error('--room must be real or calm');
  const ctx: Context = {
    settings: DEFAULT_SETTINGS,
    tuning: tuningWithOverrides(overrides, pacing),
    localTime: fixedOffsetLocalTime(0),
  };

  const all = builtInPlayers(options.diet);
  const wanted =
    options.players === 'default'
      ? all.filter((p) => p.name !== 'quarterly')
      : options.players === 'all'
        ? all
        : options.players.split(',').map((name) => {
            const found = all.find((p) => p.name === name);
            if (!found)
              throw new Error(
                `Unknown player "${name}"; choose from ${all.map((p) => p.name).join(', ')}`,
              );
            return found;
          });

  const hatchMs = Date.UTC(2026, 0, 5, 12); // 12:00 on a Monday
  const results: PlayerResult[] = wanted.map((player: Player) => ({
    player: player.name,
    summary: summarize(
      Array.from({ length: options.lives }, (_, i) =>
        simulateLife({ seed: options.seed + i, player, ctx, hatchMs, maxDays: options.days }),
      ),
    ),
  }));

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  const title = `Dinkie Dino simulator: ${options.lives} lives per player, room ${options.room}, pacing ${options.pacing}, diet ${options.diet}, up to ${options.days} days${
    overrides.length ? `, overrides: ${overrides.join(' ')}` : ''
  }`;
  console.log(formatReport(results, title));
}

main();
