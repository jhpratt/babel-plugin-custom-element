import * as Babel from '@babel/core';
import { ClassDeclaration } from '@babel/types';
import { Key } from '../state_key';
import { State } from '..';

/**
 * Add `window.customElements.register(...)` after the class declaration.
 *
 * @param t Babel type helper
 * @param template Babel template helper
 * @param state Class-wide state object
 * @param class_path Path to the class declaration
 */
export function register_element(
    { t, template }: { t: typeof Babel.types; template: typeof Babel.template },
    state: State,
    class_path: Babel.NodePath<ClassDeclaration>,
): void {
    if (class_path.node.id === null) {
        throw new Error('Cannot register an element with an unnamed class.');
    }

    const class_name = t.identifier(class_path.node.id.name);
    const tag_name = t.stringLiteral(state[Key.tag_name]);

    class_path.insertAfter(
        template.ast`
            window.customElements.define(${tag_name}, ${class_name});
        `,
    );
}
