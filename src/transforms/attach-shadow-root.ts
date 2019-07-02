import * as Babel from '@babel/core';
import { State } from '..';
import { Key } from '../state_key';

export function attach_shadow_root(
    { template }: { template: typeof Babel.template },
    state: State,
): void {
    if (!state[Key.shadow_root]) {
        return;
    }

    // Attach the shadow.
    state[Key.constructor].node.body.body.splice(
        state[Key.constructor_insert_index],
        0,
        template.statement.ast`this.attachShadow({ mode: 'open' });`,
    );
}
