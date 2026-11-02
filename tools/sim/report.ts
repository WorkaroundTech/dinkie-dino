import type { Summary } from './stats';

export interface PlayerResult {
  player: string;
  summary: Summary;
}

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const days = (hours: number) => (hours / 24).toFixed(1);

function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const line = (cells: string[]) =>
    cells
      .map((c, i) => c.padEnd(widths[i] ?? 0))
      .join('  ')
      .trimEnd();
  return [line(headers), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n');
}

/** A readable report of one run: a headline table, then causes of death, species and effort. */
export function formatReport(results: readonly PlayerResult[], title: string): string {
  const sections: string[] = [title, ''];

  sections.push(
    table(
      [
        'player',
        'visits/day',
        'final',
        'died',
        'life p10/med/p90 (days)',
        'trouble',
        'needs',
        'hungry',
        'thirsty',
        'sad',
        'dirty',
        'hot',
        'cold',
        'sick',
      ],
      results.map(({ player, summary: s }) => {
        const c = s.troubleShare.byCondition;
        return [
          player,
          s.sessionsPerDay.toFixed(1),
          pct(s.reachedFinal),
          pct(s.died),
          `${days(s.hoursLived.p10)} / ${days(s.hoursLived.median)} / ${days(s.hoursLived.p90)}`,
          pct(s.troubleShare.any),
          pct(s.troubleShare.need),
          pct(c['hungry'] ?? 0),
          pct(c['thirsty'] ?? 0),
          pct(c['sad'] ?? 0),
          pct(c['dirty'] ?? 0),
          pct(c['tooHot'] ?? 0),
          pct(c['tooCold'] ?? 0),
          pct(c['sick'] ?? 0),
        ];
      }),
    ),
  );
  sections.push(
    '',
    '"trouble" is the share of awake time the pet shows any condition; "needs" only hungry, thirsty or sad.',
  );

  sections.push('', 'Causes of death (share of all lives)', '');
  sections.push(
    table(
      ['player', 'sick', 'thirst', 'hunger', 'happiness', 'tooHot', 'tooCold', 'tooHeavy', 'shock'],
      results.map(({ player, summary: s }) => {
        const n = (k: keyof Summary['deathCauses']) =>
          pct((s.deathCauses[k] ?? 0) / Math.max(1, s.lives));
        return [
          player,
          n('sick'),
          n('thirst'),
          n('hunger'),
          n('lowHappiness'),
          n('tooHot'),
          n('tooCold'),
          n('tooHeavy'),
          n('shock'),
        ];
      }),
    ),
  );

  sections.push(
    '',
    'Species of the pets that grew a tail (share of all lives) and effort (actions per day)',
    '',
  );
  sections.push(
    table(
      [
        'player',
        'T-Rex',
        'Brontosaurus',
        'Triceratops',
        'drink',
        'food',
        'pet',
        'play',
        'bath',
        'ac',
        'medical',
      ],
      results.map(({ player, summary: s }) => {
        const sp = (k: keyof Summary['species']) => pct((s.species[k] ?? 0) / Math.max(1, s.lives));
        const a = (k: string) => (s.actionsPerDay[k] ?? 0).toFixed(1);
        return [
          player,
          sp('trex'),
          sp('bronto'),
          sp('triceratops'),
          a('drink'),
          a('food'),
          a('pet'),
          a('play'),
          a('bath'),
          a('ac'),
          a('medical'),
        ];
      }),
    ),
  );

  sections.push('', 'Lifespan histogram (lives per whole day lived)', '');
  const maxDay = Math.max(
    0,
    ...results.flatMap((r) => Object.keys(r.summary.lifespanDays).map(Number)),
  );
  sections.push(
    table(
      ['player', ...Array.from({ length: maxDay + 1 }, (_, d) => `d${d}`)],
      results.map(({ player, summary: s }) => [
        player,
        ...Array.from({ length: maxDay + 1 }, (_, d) => String(s.lifespanDays[d] ?? 0)),
      ]),
    ),
  );
  return sections.join('\n');
}
