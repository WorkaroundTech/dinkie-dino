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

  sections.push('', 'Sicknesses per life (mean), by cause', '');
  sections.push(
    table(
      ['player', 'dirt', 'light', 'wake', 'temperature', 'weight'],
      results.map(({ player, summary: s }) => [
        player,
        ...(['dirt', 'light', 'wake', 'temperature', 'weight'] as const).map((c) =>
          (s.sicknessPerLife[c] ?? 0).toFixed(2),
        ),
      ]),
    ),
  );

  sections.push(
    '',
    'Proposed care score (docs/16): points per life p10 / median / p90, and mistakes per life',
    '',
  );
  sections.push(
    table(
      ['player', 'points', 'sick', 'hot', 'cold', 'dirty', 'light', 'hungry', 'thirsty', 'sad'],
      results.map(({ player, summary: s }) => [
        player,
        `${s.carePoints.p10.toFixed(0)} / ${s.carePoints.median.toFixed(0)} / ${s.carePoints.p90.toFixed(0)}`,
        ...(
          ['sick', 'tooHot', 'tooCold', 'dirty', 'lightOn', 'hungry', 'thirsty', 'sad'] as const
        ).map((k) => (s.mistakesPerLife[k] ?? 0).toFixed(1)),
      ]),
    ),
  );

  sections.push(
    '',
    'Of the pets that reach the final form, the share that would be an Angel at each threshold (care points at most)',
    '',
  );
  sections.push(
    table(
      ['player', '8', '16', '24', '32', '48'],
      results.map(({ player, summary: s }) => [
        player,
        ...([8, 16, 24, 32, 48] as const).map((limit) => pct(s.angelShareAtMost[limit] ?? 0)),
      ]),
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
