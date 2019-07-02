import * as Babel from '@babel/core';
import {
    ClassDeclaration,
    ClassMethod,
} from '@babel/types';
import { Key } from '../state_key';
import { State } from '..';

export function create_connected_callback(
    { t }: { t: typeof Babel.types },
    state: State,
    klass: Babel.NodePath<ClassDeclaration>,
): void {
    const existing_method_path = klass
        .get('body')
        .get('body')
        .find(({ node }) =>
            t.isClassMethod(node, { kind: 'method' })
            && t.isIdentifier(node.key, { name: 'connectedCallback' }),
        ) as Babel.NodePath<ClassMethod> | undefined;

    if (existing_method_path === undefined) {
        const new_method_node = t.classMethod(
            'method',
            t.identifier('connectedCallback'),
            [],
            t.blockStatement([]),
        );

        klass.node.body.body.push(new_method_node);
    }

    // Get the path of the newly created object.
    const new_method_path = klass
        .get('body')
        .get('body')
        .find(({ node }) =>
            t.isClassMethod(node, { kind: 'method' })
            && t.isIdentifier(node.key, { name: 'connectedCallback' }),
        ) as Babel.NodePath<ClassMethod>;

    state[Key.connected_callback]
        = existing_method_path === undefined
            ? new_method_path
            : existing_method_path;
}
