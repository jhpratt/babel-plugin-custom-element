import * as Babel from '@babel/core';
import { State } from '..';
import { Key } from '../state_key';

export function require_super(
    { t, template }: { t: typeof Babel.types; template: typeof Babel.template },
    state: State,
): void {
    const constructor_body = state[Key.constructor].node.body.body;

    state[Key.constructor_insert_index]
        = constructor_body.findIndex(
            node =>
                t.isExpressionStatement(node)
                && t.isCallExpression(node.expression)
                && t.isSuper(node.expression.callee),
        ) + 1;

    // No super call, create one.
    if (state[Key.constructor_insert_index] === 0) {
        state[Key.constructor_insert_index] = constructor_body.push(
            template.statement.ast`super();`,
        );
    }
}
