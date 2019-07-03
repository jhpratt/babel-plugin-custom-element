import * as Babel from '@babel/core';
import { declare } from '@babel/helper-plugin-utils';
import {
    ClassDeclaration,
    ClassMethod,
    JSXElement,
    JSXFragment,
    StringLiteral,
    JSXExpressionContainer,
} from '@babel/types';
import { SetterMetadata } from './classes/SetterMetadata';
import { store_class_metadata } from './parser_metadata/store-class-metadata';
import { store_needs_derives } from './parser_metadata/store-needs-derives';
import {
    add_private_refs_member_to_body,
    add_private_named_refs_member_to_body,
    store_refs,
} from './parser_metadata/store-setter-metadata';
import { store_static_html_path } from './parser_metadata/store-static-html';
import { Key } from './state_key';
import { register_element } from './transforms/register-element';
import { rename_superclass } from './transforms/rename-superclass';
import { add_getters } from './transforms/add-getter';
import { add_setters } from './transforms/add-setter';
import { create_constructor } from './transforms/create-constructor';
import { attach_shadow_root } from './transforms/attach-shadow-root';
import { require_super } from './transforms/require-super';
import { add_attributes } from './transforms/add-attributes';
import { jsx_to_dom } from './transforms/jsx-dom/designator';
import {
    create_connected_callback,
} from './transforms/create-connected-callback';

export interface State {
    [Key.attributes]: [StringLiteral, StringLiteral][];
    [Key.connected_callback_insert_index]: number;
    [Key.connected_callback]: Babel.NodePath<ClassMethod>;
    [Key.constructor_insert_index]: number;
    [Key.constructor]: Babel.NodePath<ClassMethod>;
    [Key.needs_named_ref]: boolean;
    [Key.need_getter]: Set<string>;
    [Key.need_setter]: Set<string>;
    [Key.needs_ref]: Set<JSXElement | JSXExpressionContainer>;
    [Key.setter_metadata]: SetterMetadata;
    [Key.shadow_root]: boolean;
    [Key.static_html]: Babel.NodePath<JSXFragment | JSXElement>;
    [Key.tag_name]: string;
}

/**
 * Requires the following syntax plugins:
 *   - jsx
 *   - decorators (current or legacy)
 *   - classProperties
 *   - classPrivateProperties
 *   - classPrivateMethods
 *
 * I couldn't manage to add the plugins in a compatible way,
 * so at least for now users of this library must include the
 * plugins themselves.
 */
function plugin(babel: typeof Babel): any {
    const { types: t, template } = babel;

    return {
        name: 'custom-element',

        visitor: {
            ClassDeclaration(path: Babel.NodePath<ClassDeclaration>): void {
                if (
                    !t.isIdentifier(path.node.superClass, {
                        name: 'CustomElement',
                    })
                ) {
                    return;
                }
                const state: State = Object.create(null);
                state[Key.need_getter] = new Set();
                state[Key.need_setter] = new Set();
                state[Key.needs_named_ref] = false;

                if (!store_class_metadata({ t }, state, path)) {
                    return;
                }

                const has_static_html = store_static_html_path(
                    { t },
                    state,
                    path,
                );

                store_needs_derives({ t }, state, path);

                if (has_static_html) {
                    state[Key.setter_metadata] = new SetterMetadata();
                    store_refs({ t }, state, path);

                    if (state[Key.needs_ref].size !== 0) {
                        add_private_refs_member_to_body({ t }, path.node);
                    }
                }

                rename_superclass({ t }, path);
                register_element({ t, template }, state, path);
                add_getters({ t }, state, path.node);
                add_setters({ t, template }, state, path.node);

                if (
                    (state[Key.shadow_root] && has_static_html)
                    || state[Key.attributes].length !== 0
                ) {
                    create_constructor({ t }, state, path);
                    require_super({ t, template }, state);
                }

                if (!state[Key.shadow_root] && has_static_html) {
                    create_connected_callback({ t }, state, path);
                    state[Key.connected_callback_insert_index] = 0;
                }

                if (state[Key.shadow_root] && has_static_html) {
                    attach_shadow_root({ template }, state);
                }

                add_attributes({ t, template }, state);
                jsx_to_dom(t, template, state);

                if (has_static_html && state[Key.needs_named_ref]) {
                    add_private_named_refs_member_to_body({ t }, path.node);
                }
            },
        },
    };
}

export default declare(
    (
        babel: typeof Babel & { assertVersion(version: string | number): void },
    ) => {
        babel.assertVersion(7);
        return plugin(babel);
    },
);
