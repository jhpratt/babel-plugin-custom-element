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
    ClassDeclaration,
} from '@babel/types';
import { Scope } from '@babel/traverse';
import { element_to_dom } from './element';
import { frag_to_dom } from './fragment';
import { State } from '../..';
import { Key } from '../../state_key';
import { dynamic_text_to_dom, static_text_to_dom } from './text-node';

export function designator(
    {
        t,
        template,
        state,
        node,
        parent,
        scope,
        klass,
    }: {
        t: typeof Babel.types;
        template: typeof Babel.template;
        state: State;
        node:
        | JSXElement
        | JSXFragment
        | JSXText
        | JSXExpressionContainer
        | JSXSpreadChild;
        parent: Identifier | MemberExpression | ThisExpression;
        scope: Scope;
        klass: ClassDeclaration;
    },
): Statement[] {
    if (t.isJSXFragment(node)) {
        return frag_to_dom({ t, template, state, node, parent, scope, klass });
    } else if (t.isJSXElement(node)) {
        return element_to_dom({
            t,
            template,
            state,
            node,
            parent,
            scope,
            klass,
        });
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
    klass: ClassDeclaration,
): void {
    const method = state[Key.shadow_root]
        ? state[Key.constructor]
        : state[Key.connected_callback];

    const parent = state[Key.shadow_root]
        ? t.memberExpression(t.thisExpression(), t.identifier('shadowRoot'))
        : t.thisExpression();

    const statements = designator({
        t,
        template,
        state,
        node: state[Key.static_html].node,
        parent,
        scope: method.scope,
        klass,
    });

    method.node.body.body.splice(
        (state[Key.constructor_insert_index] += statements.length),
        0,
        ...statements,
    );

    state[Key.static_html].parentPath.remove();
}
