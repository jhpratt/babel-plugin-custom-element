import * as Babel from '@babel/core';
import {
    JSXElement,
    JSXFragment,
    Identifier,
    MemberExpression,
    Statement,
    JSXExpressionContainer,
    JSXText,
    JSXSpreadChild,
    ThisExpression,
} from '@babel/types';
import { Scope } from '@babel/traverse';
import { element_to_dom } from './element';
import { frag_to_dom } from './fragment';
import { State } from '../..';
import { Key } from '../../state_key';
import { dynamic_text_to_dom, static_text_to_dom } from './text-node';

export function designator(
    t: typeof Babel.types,
    template: typeof Babel.template,
    state: State,
    node:
    | JSXElement
    | JSXFragment
    | JSXText
    | JSXExpressionContainer
    | JSXSpreadChild,
    parent: Identifier | MemberExpression | ThisExpression,
    scope: Scope,
): Statement[] {
    if (t.isJSXFragment(node)) {
        return frag_to_dom(t, template, state, node, parent, scope);
    } else if (t.isJSXElement(node)) {
        return element_to_dom(t, template, state, node, parent, scope);
    } else if (t.isJSXExpressionContainer(node)) {
        return dynamic_text_to_dom(t, template, state, node, parent, scope);
    } else if (t.isJSXText(node)) {
        return static_text_to_dom(t, template, node, parent);
    }

    return [];
}

export function jsx_to_dom(
    t: typeof Babel.types,
    template: typeof Babel.template,
    state: State,
): void {
    if (state[Key.shadow_root]) {
        const constructor = state[Key.constructor];
        const statements = designator(
            t,
            template,
            state,
            state[Key.static_html].node,
            t.memberExpression(t.thisExpression(), t.identifier('shadowRoot')),
            constructor.scope,
        );

        constructor.node.body.body.splice(
            (state[Key.constructor_insert_index] += statements.length),
            0,
            ...statements,
        );
    } else {
        const method = state[Key.connected_callback];
        const statements = designator(
            t,
            template,
            state,
            state[Key.static_html].node,
            t.thisExpression(),
            method.scope,
        );

        method.node.body.body.splice(
            (state[Key.connected_callback_insert_index] += statements.length),
            0,
            ...statements,
        );
    }

    state[Key.static_html].parentPath.remove();
}
