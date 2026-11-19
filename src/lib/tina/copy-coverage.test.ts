import { createRequire } from 'node:module';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import site from '../../../content/site/site.json';
import { siteFields } from './site-schema';

const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve('astro/package.json'));
const { parse } = astroRequire('@astrojs/compiler-rs');
const root = fileURLToPath(new URL('../../', import.meta.url)).replace(
	/\/$/,
	'',
);
type Node = Record<string, unknown> & { type?: string };
const copyAttributes = new Set([
	'alt',
	'title',
	'aria-label',
	'placeholder',
	'description',
]);
const hasWords = (value: unknown): value is string =>
	typeof value === 'string' &&
	/\p{L}/u.test(value) &&
	!/^&(?:#\d+|#x[\da-f]+|[a-z]+);$/i.test(value.trim());

async function astroFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const path = `${directory}/${entry.name}`;
			return entry.isDirectory() ? astroFiles(path) : [path];
		}),
	);
	return files.flat().filter((path) => path.endsWith('.astro'));
}

describe('site-wide editable copy coverage', () => {
	it('exposes every authored text and business value in the fixed Tina schema', () => {
		const authored: Record<string, string> = {};
		function collect(value: unknown, path = '') {
			if (value && typeof value === 'object') {
				expect(Array.isArray(value), path).toBe(false);
				for (const [key, child] of Object.entries(value)) {
					collect(child, path ? `${path}.${key}` : key);
				}
			} else authored[path] = typeof value;
		}
		collect(site);
		const exposed: Record<string, string> = {};
		function fields(items: ReturnType<typeof siteFields>, path = '') {
			for (const field of items) {
				const key = path ? `${path}.${field.name}` : field.name;
				expect(field.type).not.toBe('image');
				expect('list' in field && field.list).not.toBe(true);
				if ('fields' in field && field.fields) fields(field.fields, key);
				else exposed[key] = field.type;
			}
		}
		fields(siteFields());
		expect(exposed).toEqual(authored);
	});

	it('keeps authored text and accessible labels out of Astro markup', async () => {
		const files = (
			await Promise.all(
				['components', 'layouts', 'pages'].map((directory) =>
					astroFiles(`${root}/${directory}`),
				),
			)
		).flat();
		const literals: string[] = [];
		for (const file of files) {
			const source = await readFile(file, 'utf8');
			const { ast } = await parse(source);
			const record = (node: Node, value: unknown) => {
				if (!hasWords(value)) return;
				const line = source.slice(0, Number(node.start)).split('\n').length;
				literals.push(
					`${file.slice(root.length + 1)}:${line}: ${value.trim()}`,
				);
			};
			function output(value: unknown) {
				if (!value || typeof value !== 'object') return;
				const node = value as Node;
				if (node.type === 'Literal') record(node, node.value);
				if (node.type === 'ConditionalExpression') {
					output(node.consequent);
					output(node.alternate);
				}
				if (node.type === 'LogicalExpression') output(node.right);
				if (node.type === 'TemplateLiteral') {
					for (const part of node.quasis as Node[]) {
						record(part, (part.value as Node).raw);
					}
				}
			}
			function visit(value: unknown) {
				if (!value || typeof value !== 'object') return;
				if (Array.isArray(value)) {
					value.forEach((child) => visit(child));
					return;
				}
				const node = value as Node;
				if (node.type === 'JSXElement') {
					const opening = node.openingElement as Node;
					const name = (opening.name as Node)?.name;
					if (name === 'script' || name === 'style') return;
				}
				if (node.type === 'JSXAttribute') {
					const name = (node.name as Node).name as string;
					if (copyAttributes.has(name)) {
						const literal = node.value as Node | null;
						if (literal?.type === 'Literal') record(node, literal.value);
					}
					return;
				}
				if (node.type === 'JSXText') record(node, node.value);
				if (node.type === 'JSXExpressionContainer') output(node.expression);
				for (const [key, child] of Object.entries(node)) {
					if (key !== 'frontmatter' && key !== 'comments') visit(child);
				}
			}
			visit(ast);
		}
		expect(literals, 'Move authored copy into the site CMS document.').toEqual(
			[],
		);
	});
});
