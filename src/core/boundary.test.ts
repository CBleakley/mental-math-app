/**
 * @jest-environment node
 */
import { ESLint } from 'eslint';
import path from 'path';

// Guards the rule that src/core never imports React, Expo or browser APIs.
const root = path.resolve(__dirname, '../..');
// Load the config directly: ESLint's own config loader needs dynamic import, which Jest blocks.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../../eslint.config.js');
const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config });

async function ruleIdsFor(code: string, file: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, file) });
  return result.messages.map((m) => m.ruleId ?? 'fatal');
}

describe('src/core import boundary', () => {
  it.each([
    "import React from 'react';",
    "import { View } from 'react-native';",
    "import * as Speech from 'expo-speech';",
    "import { registerRootComponent } from 'expo';",
    "import { x } from '../adapters/web/x';",
  ])('rejects %s', async (code) => {
    expect(await ruleIdsFor(`${code}\n`, 'src/core/bad.ts')).toContain('no-restricted-imports');
  });

  it.each(['window.alert(1);', 'speechSynthesis.cancel();', "localStorage.getItem('x');"])(
    'rejects browser global in %s',
    async (code) => {
      expect(await ruleIdsFor(`${code}\n`, 'src/core/bad.ts')).toContain('no-restricted-globals');
    },
  );

  it('allows plain TypeScript in core', async () => {
    expect(await ruleIdsFor("import { add } from './sample';\nexport const x = add(1, 2);\n", 'src/core/good.ts')).toEqual([]);
  });

  it('allows React outside core', async () => {
    expect(await ruleIdsFor("import { View } from 'react-native';\nexport const V = View;\n", 'src/ui/ok.ts')).toEqual([]);
  });
});
