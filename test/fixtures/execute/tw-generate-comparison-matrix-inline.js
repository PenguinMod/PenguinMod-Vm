const fs = require('fs');
const Cast = require('../../../src/util/cast');

/*
This is a command-line tool to generate the tw-comparison-matrix-inline test project.

To use output:
Blockly.Xml.domToWorkspace(
    new DOMParser().parseFromString(XML_GOES_HERE, 'text/xml').documentElement,
    Blockly.getMainWorkspace()
);
*/

/* eslint-disable no-console */

const VALUES = [
    '0',
    '0.0',
    '1.23',
    '.23',
    '0.123',
    '-0',
    '-1',
    'true',
    'false',
    'NaN',
    'Infinity',
    'banana',
    '🎉',
    ''
];

const OPERATORS = [
    {
        opcode: 'operator_lt',
        symbol: '&lt;',
        execute: (a, b) => Cast.compare(a, b) < 0
    },
    {
        opcode: 'operator_equals',
        symbol: '=',
        execute: (a, b) => Cast.compare(a, b) === 0
    },
    {
        opcode: 'operator_gt',
        symbol: '&gt;',
        execute: (a, b) => Cast.compare(a, b) > 0
    },
    {
        opcode: 'operator_ltorequal',
        symbol: '&lt;=',
        execute: (a, b) => Cast.compare(a, b) <= 0
    },
    {
        opcode: 'operator_notequal',
        symbol: '≠',
        execute: (a, b) => Cast.compare(a, b) !== 0
    },
    {
        opcode: 'operator_gtorequal',
        symbol: '&gt;=',
        execute: (a, b) => Cast.compare(a, b) >= 0
    },
];

const NEXT = '{{NEXT}}';
const MSG_DURATION = '2';

let result = `
<xml>
    <block type="event_whenflagclicked">
        <next>
            <block type="looks_sayforsecs">
                <value name="MESSAGE">
                    <shadow type="text">
                        <field name="TEXT">plan 0</field>
                    </shadow>
                </value>
                <value name="SECS">
                    <shadow type="math_number">
                        <field name="NUM">${MSG_DURATION}</field>
                    </shadow>
                </value>
                ${NEXT}
            </block>
        </next>
    </block>
</xml>
`;

let n = 0;
for (const i of VALUES) {
    for (const j of VALUES) {
        for (const operator of OPERATORS) {
            n++;
            result = result.replace(NEXT, `
            <next>
                <block type="control_if">
                    <value name="CONDITION">
                        <block type="operator_not">
                            <value name="OPERAND">
                                <block type="operator_equals">
                                    <value name="OPERAND1">
                                        <shadow type="text">
                                            <field name="TEXT"></field>
                                        </shadow>
                                        <block type="${operator.opcode}">
                                            <value name="OPERAND1">
                                                <shadow type="text">
                                                    <field name="TEXT">${i}</field>
                                                </shadow>
                                            </value>
                                            <value name="OPERAND2">
                                                <shadow type="text">
                                                    <field name="TEXT">${j}</field>
                                                </shadow>
                                            </value>
                                        </block>
                                    </value>
                                    <value name="OPERAND2">
                                        <shadow type="text">
                                            <field name="TEXT">${operator.execute(i, j)}</field>
                                        </shadow>
                                    </value>
                                </block>
                            </value>
                        </block>
                    </value>
                    <statement name="SUBSTACK">
                        <block type="looks_sayforsecs">
                            <value name="MESSAGE">
                                <shadow type="text">
                                    <field name="TEXT">fail ${n}: ${i} should be ${operator.symbol} ${j}</field>
                                </shadow>
                            </value>
                            <value name="SECS">
                                <shadow type="math_number">
                                    <field name="NUM">${MSG_DURATION}</field>
                                </shadow>
                            </value>
                        </block>
                    </statement>
                    ${NEXT}
                </block>
            </next>
            `.replace(/ {4}/g, ' '));
        }
    }
}

result = result.replace(NEXT, `
<next>
    <block type="looks_sayforsecs">
        <value name="MESSAGE">
            <shadow type="text">
                <field name="TEXT">end</field>
            </shadow>
        </value>
        <value name="SECS">
            <shadow type="math_number">
                <field name="NUM">${MSG_DURATION}</field>
            </shadow>
        </value>
    </block>
</next>
`);

result = result.replace(NEXT, '');

console.log(`Expecting ${n}`);
fs.writeFileSync('matrix-inline-output-do-not-commit.xml', result);
