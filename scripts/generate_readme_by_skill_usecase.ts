import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

type Skill = 'beginner' | 'intro' | 'intermediate' | 'advanced';
interface Frontmatter {
  title?: string;
  id?: string;
  skillLevel?: Skill;
  useCase?: string[];
  summary?: string;
  tags?: string[];
}

interface PatternMeta {
  readonly file: string;
  readonly relPath: string;
  readonly title: string;
  readonly id: string;
  readonly skillLevel: 'intro' | 'intermediate' | 'advanced';
  readonly useCase: ReadonlyArray<string>;
  readonly summary?: string;
  readonly tags?: ReadonlyArray<string>;
}

const skillOrder: Readonly<Record<string, number>> = {
  intro: 0,
  beginner: 0, // normalize to intro
  intermediate: 1,
  advanced: 2,
} as const;

const normalizeSkill = (
  s: Frontmatter['skillLevel'] | undefined,
): PatternMeta['skillLevel'] => {
  if (!s) return 'intermediate';
  return s === 'beginner' ? 'intro' : (s as any);
};

const primaryUseCase = (values: ReadonlyArray<string> | undefined): string => {
  if (!values || values.length === 0) return 'Uncategorized';
  return values[0];
};

const listMdxFiles = async (root: string): Promise<string[]> => {
  const results: string[] = [];

  const walk = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.name.toLowerCase().endsWith('.mdx')) {
        results.push(full);
      }
    }
  };

  await walk(root);
  return results;
};

const parseArray = (raw: string | undefined): string[] => {
  if (!raw) return [];
  // extract quoted strings within [ ... ]
  const matches = raw.match(/"([^"]+)"|'([^']+)'/g) ?? [];
  return matches.map((m) => m.replace(/^['"]|['"]$/g, ''));
};

const readFrontmatter = async (
  file: string,
  root: string,
): Promise<PatternMeta> => {
  const content = await fs.readFile(file, 'utf8');
  // Grab leading frontmatter between --- ... ---
  const fmBlockMatch = content.match(/^---[\s\S]*?---/);
  const fmBlock = fmBlockMatch ? fmBlockMatch[0] : '';

  const get = (key: string) => {
    const m = fmBlock.match(new RegExp(`^${key}\\s*:\\s*(.*)$`, 'm'));
    return m ? m[1].trim() : undefined;
  };

  const titleRaw = get('title');
  const idRaw = get('id');
  const skillRaw = get('skillLevel') as Skill | undefined;
  const useCaseRaw = get('useCase');
  const summaryRaw = get('summary');
  const tagsRaw = get('tags');

  const title = (
    titleRaw ? titleRaw.replace(/^"|"$/g, '') : path.basename(file)
  ).trim();
  const id = (
    idRaw ? idRaw.replace(/^"|"$/g, '') : path.basename(file, '.mdx')
  ).trim();
  const skill = normalizeSkill(
    skillRaw
      ? ((skillRaw as string).replace(/^['"]|['"]$/g, '') as Skill)
      : undefined,
  );
  const uc = parseArray(useCaseRaw);
  const summary = summaryRaw ? summaryRaw.replace(/^"|"$/g, '') : undefined;
  const tags = parseArray(tagsRaw);

  return {
    file,
    relPath: path.relative(root, file),
    title,
    id,
    skillLevel: skill,
    useCase: uc,
    summary,
    tags,
  };
};

const byTitle = (a: PatternMeta, b: PatternMeta) =>
  a.title.localeCompare(b.title);

const render = (items: ReadonlyArray<PatternMeta>, root: string): string => {
  const bySkill = new Map<string, PatternMeta[]>();
  for (const it of items) {
    const key = it.skillLevel;
    const list = bySkill.get(key) ?? [];
    list.push(it);
    bySkill.set(key, list);
  }

  const ordSkills = ['intro', 'intermediate', 'advanced'] as const;

  const sectionFor = (skill: (typeof ordSkills)[number]): string => {
    const list = (bySkill.get(skill) ?? []).slice();
    const byUc = new Map<string, PatternMeta[]>();
    for (const it of list) {
      const primary = primaryUseCase(it.useCase);
      const arr = byUc.get(primary) ?? [];
      arr.push(it);
      byUc.set(primary, arr);
    }

    const ucNames = Array.from(byUc.keys()).sort((a, b) => a.localeCompare(b));

    const ucSections = ucNames
      .map((uc) => {
        const group = (byUc.get(uc) ?? []).slice();
        group.sort(byTitle);
        const lines: string[] = [];
        lines.push(`### ${uc} (${group.length})`);
        lines.push('');
        for (const it of group) {
          const others = (it.useCase ?? []).slice(1);
          const badges =
            others.length > 0
              ? `  - badges: ${others.map((x) => `\`${x}\``).join(', ')}`
              : '';
          const tagBadges =
            it.tags && it.tags.length > 0
              ? `${badges ? '\n' : '  '}- tags: ${it.tags
                  .map((x) => `\`${x}\``)
                  .join(', ')}`
              : '';
          const summary = it.summary ? `\n  - summary: ${it.summary}` : '';
          lines.push(
            `- [${it.title}](./${it.relPath})${badges}${tagBadges}${summary}`,
          );
        }
        lines.push('');
        return lines.join('\n');
      })
      .join('\n');

    const header = `## ${skill.charAt(0).toUpperCase()}${skill.slice(1)}`;
    return [header, '', ucSections].join('\n');
  };

  const startHere = (() => {
    const intros = (bySkill.get('intro') ?? []).slice();
    intros.sort(byTitle);
    let pick = intros.slice(0, 10);
    // try curated list if present
    try {
      const cfgPath = path.join(root, '_start_here.json');
      const raw = fsSync.readFileSync(cfgPath, 'utf8');
      const parsed = JSON.parse(raw) as { ids?: string[] } | string[];
      const ids = Array.isArray(parsed) ? parsed : (parsed.ids ?? []);
      if (ids.length > 0) {
        const map = new Map(intros.map((m) => [m.id, m] as const));
        const curated = ids
          .map((id) => map.get(id))
          .filter(Boolean) as PatternMeta[];
        if (curated.length > 0) pick = curated;
      }
    } catch {}
    const lines: string[] = [];
    lines.push('## Start Here');
    lines.push('');
    for (const it of pick) {
      lines.push(`- [${it.title}](./${it.relPath})`);
    }
    lines.push('');
    return lines.join('\n');
  })();

  const toc = [
    '## Table of Contents',
    '',
    '- [Start Here](#start-here)',
    '- [Intro](#intro)',
    '- [Intermediate](#intermediate)',
    '- [Advanced](#advanced)',
    '',
  ].join('\n');

  const body = ordSkills.map(sectionFor).join('\n\n---\n\n');

  return [
    '# Effect Patterns Index (Review)',
    '',
    'Grouped by skillLevel (intro → intermediate → advanced) then by the ',
    'primary useCase (first element). Remaining useCase values appear as ',
    'badges. Tie-breaker within groups is title (A–Z).',
    '',
    toc,
    '---',
    '',
    startHere,
    '---',
    '',
    body,
    '',
    '---',
    '',
    'Notes:',
    '',
    '- Primary useCase is the first element in the useCase array.',
    '- Remaining useCase values appear as badges under each item.',
    '- Ordering within each bucket is title A–Z.',
    '',
  ].join('\n');
};

async function main() {
  const root = path.resolve('content/published');
  const out = path.join(root, '_README.review.md');

  const files = await listMdxFiles(root);
  // eslint-disable-next-line no-console
  console.log(`[generate-readme] Found MDX files: ${files.length}`);
  const metas = await Promise.all(files.map((f) => readFrontmatter(f, root)));

  const normalized = metas.map((m) => ({
    ...m,
    skillLevel: normalizeSkill(m.skillLevel),
  }));

  // eslint-disable-next-line no-console
  console.log(
    `[generate-readme] Buckets: intro=${normalized.filter((m) => m.skillLevel === 'intro').length}, ` +
      `intermediate=${normalized.filter((m) => m.skillLevel === 'intermediate').length}, ` +
      `advanced=${normalized.filter((m) => m.skillLevel === 'advanced').length}`,
  );

  normalized.sort((a, b) => {
    const so =
      (skillOrder[a.skillLevel] ?? 1) - (skillOrder[b.skillLevel] ?? 1);
    if (so !== 0) return so;
    const auc = primaryUseCase(a.useCase);
    const buc = primaryUseCase(b.useCase);
    const ucCmp = auc.localeCompare(buc);
    if (ucCmp !== 0) return ucCmp;
    return a.title.localeCompare(b.title);
  });

  const markdown = render(normalized, root);
  await fs.writeFile(out, markdown, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Generated: ${out}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
