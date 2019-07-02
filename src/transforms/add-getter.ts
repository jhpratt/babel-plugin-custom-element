import * as Babel from '@babel/core';
import { ClassDeclaration, Identifier, ClassMethod } from '@babel/types';
import { Key } from '../state_key';
import { State } from '..';

/**
 * Add all getters to the class.
 *
 * @param t Babel type helper
 * @param state Class-wide state object
 * @param klass Class node
 */
export function add_getters(
    { t }: { t: typeof Babel.types },
    state: State,
    klass: ClassDeclaration,
): void {
    /**
     * @param ident The identifier for the getter.
     * @returns A fully-formed getter for the provided private property.
     */
    function getter(ident: Identifier): ClassMethod {
        return t.classMethod(
            'get',
            ident,
            [],
            t.blockStatement([
                t.returnStatement(
                    t.memberExpression(
                        t.thisExpression(),
                        t.privateName(ident),
                    ),
                ),
            ]),
        );
    }

    for (const name of state[Key.need_getter].values()) {
        klass.body.body.push(getter(t.identifier(name)));
    }
}
