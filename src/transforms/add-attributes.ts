import * as Babel from '@babel/core';
import { State } from '..';
import { ExpressionStatement } from '@babel/types';
import { Key } from '../state_key';

export function add_attributes(
    { t, template }: { t: typeof Babel.types; template: typeof Babel.template },
    state: State,
): void {
    state[Key.attributes].forEach(([key, value = t.stringLiteral('')]) => {
        state[Key.constructor].node.body.body.splice(
            (state[Key.constructor_insert_index] += 1),
            0,
            template.ast`
                this.setAttribute(${key}, ${value});
            ` as ExpressionStatement,
        );
    });
}
