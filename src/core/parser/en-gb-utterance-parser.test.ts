import { EnGbUtteranceParser } from './en-gb-utterance-parser';

const parser = new EnGbUtteranceParser();

describe('EnGbUtteranceParser', () => {
  describe('whole numbers', () => {
    it.each([
      // In words
      ['eighty five', 85],
      ['eighty-five', 85],
      ['Eighty Five', 85],
      ['two hundred and eighty-two', 282],
      ['two hundred eighty two', 282],
      ['one hundred and five', 105],
      ['a hundred', 100],
      ['a hundred and twelve', 112],
      ['hundred', 100],
      ['eleven', 11],
      ['ninety', 90],
      ['one hundred and ten', 110],
      ['eleven hundred', 1100],
      ['two thousand three hundred and four', 2304],
      ['a thousand and one', 1001],
      ['one hundred thousand', 100000],
      // Digit by digit
      ['two eight two', 282],
      ['eight five', 85],
      ['one oh five', 105],
      ['one zero five', 105],
      ['oh seven', 7],
      // Common recogniser outputs
      ['85', 85],
      ['85.', 85],
      ['282', 282],
      ['1,282', 1282],
      ['80 5', 85],
      ['8 5', 85],
      ['2 hundred', 200],
      ['0', 0],
      ['zero', 0],
      ['nought', 0],
    ])('%s → %d', (transcript, value) => {
      expect(parser.parse(transcript)).toEqual({ kind: 'answer', value });
    });
  });

  describe('decimals', () => {
    it.each([
      ['nought point five', 0.5],
      ['naught point five', 0.5],
      ['zero point five', 0.5],
      ['oh point five', 0.5],
      ['point five', 0.5],
      ['point two five', 0.25],
      ['point twenty five', 0.25],
      ['two point five', 2.5],
      ['two point five oh', 2.5],
      ['two point five zero', 2.5],
      ['twelve point three', 12.3],
      ['two hundred point seven five', 200.75],
      ['three point oh five', 3.05],
      ['0.5', 0.5],
      ['.5', 0.5],
      ['2.50', 2.5],
      ['2.5.', 2.5],
    ])('%s → %d', (transcript, value) => {
      expect(parser.parse(transcript)).toEqual({ kind: 'answer', value });
    });
  });

  describe('fillers and extra words', () => {
    it.each([
      ['um eighty five', 85],
      ['er, 85', 85],
      ['erm... eighty five', 85],
      ['eighty um five', 85],
      ['uh two hundred and er twelve', 212],
      ['oh, 85', 85],
      ['it is eighty five', 85],
      ['the answer is 85', 85],
    ])('%s → %d', (transcript, value) => {
      expect(parser.parse(transcript)).toEqual({ kind: 'answer', value });
    });
  });

  describe('self-corrections take the last number', () => {
    it.each([
      ['eighty five no eighty six', 86],
      ['eighty five sorry eighty six', 86],
      ['85 86', 86],
      ['eighty five eighty six', 86],
      ['seventy eighty', 80],
      ['eighty five and eighty six', 86],
      ['85, I mean 86', 86],
      ['eighty five, no, ninety', 90],
      ['point five, no, point six', 0.6],
      ['two hundred and twelve no two hundred and thirteen', 213],
      ['fifteen five', 5],
    ])('%s → %d', (transcript, value) => {
      expect(parser.parse(transcript)).toEqual({ kind: 'answer', value });
    });
  });

  describe('commands', () => {
    it.each([
      ['repeat', 'repeat'],
      ['Repeat.', 'repeat'],
      ['repeat please', 'repeat'],
      ['can you repeat that', 'repeat'],
      ['um repeat', 'repeat'],
      ['skip', 'skip'],
      ['Skip.', 'skip'],
      ['skip it', 'skip'],
      ['er skip', 'skip'],
    ])('%s → %s', (transcript, command) => {
      expect(parser.parse(transcript)).toEqual({ kind: 'command', command });
    });

    it('treats a spoken number as the answer even alongside a command word', () => {
      expect(parser.parse('repeat no eighty five')).toEqual({ kind: 'answer', value: 85 });
    });
  });

  describe('unrecognised', () => {
    it.each(['', '   ', 'um', 'er erm', 'what', 'oh', 'hello there', 'and', 'a', '...', 'harder'])(
      '%j',
      (transcript) => {
        expect(parser.parse(transcript)).toEqual({ kind: 'unrecognised' });
      },
    );
  });
});
