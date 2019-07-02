import * as Babel from '@babel/core';
import {
    ClassDeclaration,
    ClassPrivateProperty,
    ClassProperty,
    Decorator,
    CallExpression,
} from '@babel/types';
import { Key } from '../state_key';
import { State } from '..';

/**
 * Store which class properties need derives (both get and set)
 *
 * @param t Babel type helper
 * @param state Class-wide state object
 * @param class_path Class node
 */
export function store_needs_derives(
    { t }: { t: typeof Babel.types },
    state: State,
    class_path: Babel.NodePath<ClassDeclaration>,
): void {
    class_path.get('body').get('body')
        .filter(
            ({ node }) =>
                t.isClassPrivateProperty(node, { static: false })
                // Cast to avoid an incorrect error.
                // See babel/babel#10065
                && Array.isArray(
                    ((node as unknown) as ClassProperty).decorators,
                ),
        )
        // @ts-ignore The case is ensured by the previous filter.
        .forEach((path: Babel.NodePath<ClassPrivateProperty>) => {
            const decorators = path.get('decorators') as
                Babel.NodePath<Decorator>[];
            const { name } = path.node.key.id;

            const derive_decorators = decorators.filter(
                dec =>
                    t.isCallExpression(dec.node.expression)
                    && t.isIdentifier(dec.node.expression.callee)
                    && dec.node.expression.callee.name === 'Derive',
            );

            if (derive_decorators.length === 0) {
                return;
            }

            if (derive_decorators.length > 1) {
                console.warn(
                    'Multiple `@Derive` decorators found. Using last declared.',
                );
            }

            const derive_args = (derive_decorators[derive_decorators.length - 1]
                .node.expression as CallExpression).arguments;

            if (derive_args.length !== 1 && derive_args.length !== 2) {
                throw new Error(
                    '`@Derive` decorator must have one or two arguments.',
                );
            }

            const need_getter: Set<string> = state[Key.need_getter];
            const need_setter: Set<string> = state[Key.need_setter];

            derive_args.forEach(arg => {
                if (
                    !t.isIdentifier(arg)
                    || !['get', 'set'].includes(arg.name.toLowerCase())
                ) {
                    throw new Error(
                        '`@Derive` decorator must only have `get` and/or `set` '
                        + 'as parameters.',
                    );
                }

                if (arg.name.toLowerCase() === 'get') {
                    need_getter.add(name);
                } else if (arg.name.toLowerCase() === 'set') {
                    need_setter.add(name);
                }
            });

            derive_decorators.forEach(dec => dec.remove());
        });
}
