import * as Babel from '@babel/core';
import {
    ClassDeclaration,
    ClassProperty,
    Node,
    JSXElement,
    JSXFragment,
} from '@babel/types';
import { Key } from '../state_key';
import { State } from '..';

/**
 * Attempt to add the `static html` to the class's state.
 *
 * @param t Babel type helper
 * @param state Class-wide state object
 * @param class_path The path object of the class declartion
 * @returns if a value was added to the store
 */
export function store_static_html_path(
    { t }: { t: typeof Babel.types },
    state: State,
    class_path: Babel.NodePath<ClassDeclaration>,
): boolean {
    const static_htmls = (class_path.get('body.body') as Babel.NodePath<
    Node
    >[]).filter(
        ({ node }) =>
            t.isClassProperty(node, { static: true, computed: false })
            && t.isIdentifier(node.key, { name: 'html' }),
    ) as Babel.NodePath<ClassProperty>[];

    if (static_htmls.length > 1) {
        console.warn(
            'Multiple instances of `static html` found in custom element. '
            + 'Using last declared.',
        );
    }
    if (static_htmls.length === 0) {
        return false;
    }
    const static_html = static_htmls[0].get('value');

    if (
        !t.isJSXElement(static_html.node)
        && !t.isJSXFragment(static_html.node)
    ) {
        throw new Error('`static html` in custom element must be valid JSX.');
    }

    state[Key.static_html] = static_html as
        Babel.NodePath<JSXFragment | JSXElement>;

    return true;
}
