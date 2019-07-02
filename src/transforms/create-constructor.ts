import * as Babel from '@babel/core';
import { ClassDeclaration, ClassMethod, Super } from '@babel/types';
import { Key } from '../state_key';
import { State } from '..';

export function create_constructor(
    { t }: { t: typeof Babel.types },
    state: State,
    klass: Babel.NodePath<ClassDeclaration>,
): void {
    const existing_constructor_path = klass
        .get('body')
        .get('body')
        .find(({ node }) => t.isClassMethod(node, { kind: 'constructor' })) as
        | Babel.NodePath<ClassMethod>
        | undefined;

    if (existing_constructor_path === undefined) {
        const new_constructor_node = t.classMethod(
            'constructor',
            t.identifier('constructor'),
            [],
            t.blockStatement([
                t.expressionStatement(
                    t.callExpression(
                        (t as typeof t & { super: () => Super }).super(),
                        [],
                    ),
                ),
            ]),
        );

        klass.node.body.body.push(new_constructor_node);
    }

    // Get the path of the newly created object.
    const new_constructor_path = klass
        .get('body')
        .get('body')
        .find(({ node }) =>
            t.isClassMethod(node, { kind: 'constructor' }),
        ) as Babel.NodePath<ClassMethod>;

    state[Key.constructor]
        = existing_constructor_path === undefined
            ? new_constructor_path
            : existing_constructor_path;
}
